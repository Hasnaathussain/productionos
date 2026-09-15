#!/usr/bin/env node
import { access, readFile, writeFile } from "node:fs/promises";
import { constants } from "node:fs";
import { join, resolve } from "node:path";
import { parse as parseYaml } from "yaml";
import {
  ProductionOSError,
  TOOL_NAME,
  TOOL_VERSION,
  loadRepositorySnapshot,
  productionOSPaths,
  type ControlFinding,
  type EvidenceRecord,
  type ProjectManifest,
  type ProjectState,
  type RemediationPlan,
  type Waiver
} from "../../../packages/core/src/index.js";
import { discoverRepository } from "../../../packages/discovery/src/index.js";
import { buildCapabilityGraph } from "../../../packages/graph/src/index.js";
import { initializeManifest, loadManifest, updateManifestFromDiscovery, writeManifest } from "../../../packages/manifest/src/index.js";
import { controlById, evaluateControls, policyVersion, requirementsForCapabilities } from "../../../packages/policy/src/index.js";
import { applyWaivers, computeGate, mergeEvidenceStatuses, renderFindings, renderGate, renderLaunch, renderStatus } from "../../../packages/reporting/src/index.js";
import { ensureStateDirectories, initializeState, loadState, saveState, updateState } from "../../../packages/state/src/index.js";
import { evidenceIsFresh, listEvidence, writeEvidence } from "../../../packages/evidence/src/index.js";
import { controlTestEvidence, projectTestEvidence, runProjectTests, verifyStatic } from "../../../packages/verifier/src/index.js";
import { applyRemediation, createRemediationPlan } from "../../../packages/remediation/src/index.js";
import { runLocalLoad, type LoadReport, type LocalLoadOptions } from "../../../packages/runtime/src/index.js";
import { analyzeSimplification, renderSimplify } from "../../../packages/simplify/src/index.js";
import { buildSloReport, renderSlo } from "../../../packages/operations/src/index.js";

interface ParsedArgs {
  command: string;
  positional: string[];
  flags: Set<string>;
  values: Map<string, string>;
}

function parseArgs(argv: string[]): ParsedArgs {
  let command = "help";
  let commandFound = false;
  const rest: string[] = [];
  for (const token of argv) {
    if (!commandFound && !token.startsWith("--")) {
      command = token;
      commandFound = true;
    } else rest.push(token);
  }
  const positional: string[] = [];
  const flags = new Set<string>();
  const values = new Map<string, string>();
  for (let index = 0; index < rest.length; index += 1) {
    const token = rest[index] as string;
    if (!token.startsWith("--")) {
      positional.push(token);
      continue;
    }
    const [rawName, inlineValue] = token.slice(2).split("=", 2);
    const name = rawName as string;
    if (inlineValue !== undefined) values.set(name, inlineValue);
    else if (["root", "task", "url", "requests", "concurrency", "method", "body", "timeout"].includes(name)) {
      const value = rest[index + 1];
      if (!value || value.startsWith("--")) throw new ProductionOSError("ARGUMENT", `--${name} requires a value.`);
      values.set(name, value);
      index += 1;
    } else flags.add(name);
  }
  return { command, positional, flags, values };
}

function rootFrom(args: ParsedArgs): string {
  return resolve(args.values.get("root") ?? process.cwd());
}

function wantsJson(args: ParsedArgs): boolean {
  return args.flags.has("json");
}

function wantsQuiet(args: ParsedArgs): boolean {
  return args.flags.has("quiet");
}

async function readJson<T>(path: string, message: string): Promise<T> {
  try {
    return JSON.parse(await readFile(path, "utf8")) as T;
  } catch {
    throw new ProductionOSError("ARTIFACT_MISSING", `${message} Expected ${path}.`);
  }
}

async function requireProject(root: string): Promise<void> {
  try {
    await access(productionOSPaths(root).manifest, constants.F_OK);
  } catch {
    throw new ProductionOSError("PROJECT_UNINITIALIZED", `No ProductionOS project found in ${root}. Run 'prodos init' first.`);
  }
}

function emit(value: unknown, text: string, args: ParsedArgs): void {
  if (wantsQuiet(args)) return;
  console.log(wantsJson(args) ? JSON.stringify(value, null, 2) : text);
}

async function writeArtifact(path: string, value: unknown): Promise<void> {
  await writeFile(path, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

async function loadAnalysis(root: string): Promise<{ manifest: ProjectManifest; discovery: Awaited<ReturnType<typeof discoverRepository>>; capabilities: ReturnType<typeof buildCapabilityGraph>; snapshot: Awaited<ReturnType<typeof loadRepositorySnapshot>> }> {
  await requireProject(root);
  const paths = productionOSPaths(root);
  const manifest = await loadManifest(paths.manifest);
  const discovery = await readJson<Awaited<ReturnType<typeof discoverRepository>>>(paths.discovery, "Discovery has not been generated.");
  const capabilities = await readJson<ReturnType<typeof buildCapabilityGraph>>(paths.capabilities, "Capabilities have not been generated.");
  const snapshot = await loadRepositorySnapshot(root);
  return { manifest, discovery, capabilities, snapshot };
}

async function loadFindings(root: string): Promise<ControlFinding[]> {
  const paths = productionOSPaths(root);
  try { return await readJson<ControlFinding[]>(join(paths.reports, "findings.json"), "Audit findings have not been generated."); } catch {
    throw new ProductionOSError("AUDIT_MISSING", "No audit findings exist. Run 'prodos audit' first.");
  }
}

async function loadWaivers(root: string): Promise<Waiver[]> {
  const directory = productionOSPaths(root).waivers;
  let entries;
  try { entries = await (await import("node:fs/promises")).readdir(directory, { withFileTypes: true }); } catch { return []; }
  const waivers: Waiver[] = [];
  for (const entry of entries.filter((item) => item.isFile() && /\.(?:json|yaml|yml)$/.test(item.name)).sort((left, right) => left.name.localeCompare(right.name))) {
    let parsed: unknown;
    try {
      parsed = parseYaml(await readFile(join(directory, entry.name), "utf8")) as unknown;
    } catch (error) {
      throw new ProductionOSError("WAIVER_INVALID", `Unable to parse waiver ${entry.name}: ${error instanceof Error ? error.message : String(error)}`);
    }
    const values = Array.isArray(parsed) ? parsed : [parsed];
    for (const [index, value] of values.entries()) {
      if (!value || typeof value !== "object" || Array.isArray(value)) throw new ProductionOSError("WAIVER_INVALID", `Waiver ${entry.name} item ${index + 1} must be an object.`);
      const candidate = value as Partial<Waiver>;
      if (typeof candidate.control !== "string" || !candidate.control.trim() || typeof candidate.reason !== "string" || !candidate.reason.trim() || typeof candidate.owner !== "string" || !candidate.owner.trim()) {
        throw new ProductionOSError("WAIVER_INVALID", `Waiver ${entry.name} item ${index + 1} requires non-empty control, reason, and owner fields.`);
      }
      if (!controlById(candidate.control.trim())) throw new ProductionOSError("WAIVER_INVALID", `Waiver ${entry.name} item ${index + 1} names unknown control '${candidate.control.trim()}'.`);
      const expiry = candidate.expires;
      const parsedExpiry = typeof expiry === "string" && /^\d{4}-\d{2}-\d{2}$/.test(expiry) ? new Date(`${expiry}T00:00:00.000Z`) : null;
      if (expiry !== undefined && (parsedExpiry === null || Number.isNaN(parsedExpiry.getTime()) || parsedExpiry.toISOString().slice(0, 10) !== expiry)) {
        throw new ProductionOSError("WAIVER_INVALID", `Waiver ${entry.name} item ${index + 1} has an invalid expires date; use YYYY-MM-DD.`);
      }
      const waiver: Waiver = { control: candidate.control.trim(), reason: candidate.reason.trim(), owner: candidate.owner.trim() };
      if (expiry !== undefined) waiver.expires = expiry;
      waivers.push(waiver);
    }
  }
  return waivers;
}

function summaryFor(findings: ControlFinding[], framework: string | null, capabilities: string[], staleEvidence: number): ProjectState["summary"] {
  return {
    framework,
    capabilities,
    unresolvedControls: findings.filter((finding) => !["NOT_APPLICABLE", "STATICALLY_VERIFIED", "TEST_VERIFIED", "RUNTIME_VERIFIED", "WAIVED"].includes(finding.status)).length,
    failedControls: findings.filter((finding) => finding.status === "FAILED").length,
    staleEvidence
  };
}

async function commandInit(root: string, args: ParsedArgs): Promise<void> {
  await ensureStateDirectories(root);
  const manifest = await initializeManifest(productionOSPaths(root).manifest, args.flags.has("force"));
  const state = await initializeState(root);
  emit({ manifest, state }, `${TOOL_NAME} initialized in ${root}\nManifest: .productionos/manifest.yaml\nNext: prodos inspect`, args);
}

async function commandInspect(root: string, args: ParsedArgs): Promise<void> {
  await requireProject(root);
  await ensureStateDirectories(root);
  const paths = productionOSPaths(root);
  const discovery = await discoverRepository(root);
  const capabilities = buildCapabilityGraph(discovery);
  const currentManifest = await loadManifest(paths.manifest);
  const manifest = updateManifestFromDiscovery(currentManifest, discovery);
  await writeManifest(paths.manifest, manifest);
  const requirements = requirementsForCapabilities(capabilities);
  await Promise.all([
    writeArtifact(paths.discovery, discovery),
    writeArtifact(paths.capabilities, capabilities),
    writeArtifact(paths.requirements, requirements)
  ]);
  const currentState = await loadState(root);
  const nextState: ProjectState = {
    ...currentState,
    currentMilestone: "discovery",
    lastCommand: "inspect",
    artifacts: ["manifest.yaml", "discovery.json", "capabilities.json", "requirements.json", "state.json"],
    summary: summaryFor([], discovery.framework, capabilities.nodes.map((node) => node.id), currentState.summary.staleEvidence),
    blockers: [],
    nextActions: ["Run prodos audit to evaluate relevant controls."] ,
    updatedAt: new Date().toISOString()
  };
  await saveState(root, nextState);
  emit({ manifest, discovery, capabilities, requirements }, `${TOOL_NAME} inspect\n\nDetected: ${discovery.framework ?? "unknown framework"}\nCapabilities: ${capabilities.nodes.map((node) => node.label).join(", ") || "none"}\nFiles scanned: ${discovery.filesScanned}\n\nNext: prodos audit`, args);
}

async function commandAudit(root: string, args: ParsedArgs): Promise<void> {
  const { manifest, discovery, capabilities, snapshot } = await loadAnalysis(root);
  const findings = evaluateControls({ root, manifest, discovery, capabilities, snapshot });
  const paths = productionOSPaths(root);
  await writeArtifact(join(paths.reports, "findings.json"), findings);
  const state = await loadState(root);
  const active = findings.filter((finding) => finding.status !== "NOT_APPLICABLE");
  await saveState(root, {
    ...state,
    currentMilestone: "policy",
    lastCommand: "audit",
    artifacts: [...new Set([...state.artifacts, "reports/findings.json"])],
    summary: summaryFor(findings, discovery.framework, capabilities.nodes.map((node) => node.id), state.summary.staleEvidence),
    blockers: active.filter((finding) => ["critical", "high"].includes(finding.severity) && finding.status !== "INFERRED").map((finding) => `${finding.controlId}: ${finding.summary}`),
    nextActions: ["Run prodos verify --static to create evidence.", "Review high and critical findings before launch."],
    updatedAt: new Date().toISOString()
  });
  emit({ findings }, renderFindings(findings, args.flags.has("verbose")), args);
}

async function commandVerify(root: string, args: ParsedArgs): Promise<void> {
  const { manifest, discovery, capabilities, snapshot } = await loadAnalysis(root);
  const existing = await loadFindings(root).catch(() => evaluateControls({ root, manifest, discovery, capabilities, snapshot }));
  const result = verifyStatic({ root, manifest, discovery, capabilities, snapshot }, existing);
  for (const evidence of result.evidence) await writeEvidence(root, evidence);
  let testEvidence: EvidenceRecord | null = null;
  if (args.flags.has("run-tests")) {
    const testResult = await runProjectTests(root, discovery.packageManager);
    testEvidence = projectTestEvidence({ root, manifest, discovery, capabilities, snapshot }, testResult);
    await writeEvidence(root, testEvidence);
    for (const evidence of controlTestEvidence({ root, manifest, discovery, capabilities, snapshot }, result.findings, testResult)) await writeEvidence(root, evidence);
  }
  const paths = productionOSPaths(root);
  await writeArtifact(join(paths.reports, "findings.json"), result.findings);
  const allEvidence = await listEvidence(root);
  const state = await loadState(root);
  const updatedFindings = mergeEvidenceStatuses(result.findings, allEvidence, (record) => evidenceIsFresh(record, snapshot), policyVersion());
  await saveState(root, {
    ...state,
    currentMilestone: "verification",
    lastCommand: args.flags.has("run-tests") ? "verify --run-tests" : "verify --static",
    artifacts: [...new Set([...state.artifacts, "evidence/", "reports/findings.json"])],
    summary: summaryFor(updatedFindings, discovery.framework, capabilities.nodes.map((node) => node.id), updatedFindings.filter((finding) => finding.status === "STALE").length),
    blockers: updatedFindings.filter((finding) => ["critical", "high"].includes(finding.severity) && ["FAILED", "UNASSESSED", "INFERRED", "STALE"].includes(finding.status)).map((finding) => `${finding.controlId}: ${finding.summary}`),
    nextActions: ["Run prodos gate to evaluate the active profile."],
    updatedAt: new Date().toISOString()
  });
  emit({ findings: updatedFindings, evidence: allEvidence, tests: testEvidence }, renderFindings(updatedFindings, args.flags.has("verbose")), args);
}

async function commandGate(root: string, args: ParsedArgs): Promise<void> {
  const { manifest, snapshot } = await loadAnalysis(root);
  const findings = await loadFindings(root);
  const evidence = await listEvidence(root);
  const waivers = await loadWaivers(root);
  const current = applyWaivers(mergeEvidenceStatuses(findings, evidence, (record) => evidenceIsFresh(record, snapshot), policyVersion()), waivers);
  const gate = computeGate(manifest, current, evidence, waivers);
  const state = await loadState(root);
  await saveState(root, { ...state, lastCommand: "gate", summary: summaryFor(current, state.summary.framework, state.summary.capabilities, gate.counts.STALE), blockers: gate.blocking.map((finding) => `${finding.controlId}: ${finding.summary}`), nextActions: gate.decision === "PASS" ? ["Continue monitoring evidence and rerun after relevant changes."] : ["Resolve or explicitly waive every blocking control, then rerun prodos verify and prodos gate."], updatedAt: new Date().toISOString() });
  emit(gate, args.command === "launch" ? renderLaunch(gate) : renderGate(gate), args);
  if (gate.decision === "BLOCKED") process.exitCode = 2;
}

async function commandStatus(root: string, args: ParsedArgs): Promise<void> {
  const state = await loadState(root);
  emit(state, renderStatus(state), args);
}

async function commandExplain(root: string, args: ParsedArgs): Promise<void> {
  const id = args.positional[0];
  if (!id) throw new ProductionOSError("ARGUMENT", "Usage: prodos explain <CONTROL_ID>");
  const definition = controlById(id);
  if (!definition) throw new ProductionOSError("CONTROL_NOT_FOUND", `Unknown control '${id}'. Run 'prodos controls --json' to list controls.`);
  const value = { id: definition.id, version: policyVersion(), title: definition.title, domain: definition.domain, severity: definition.severity, triggerCapabilities: definition.triggerCapabilities, rationale: definition.rationale, recommendation: definition.recommendation, failureModes: definition.failureModes, tradeoffs: definition.tradeoffs, verification: definition.verification, evidence: definition.evidence, limitations: definition.limitations, falsePositiveBoundary: definition.falsePositiveBoundary, affectedFiles: definition.affectedFiles };
  if (args.flags.has("agent")) {
    const agentValue = {
      control: {
        id: value.id,
        title: value.title,
        domain: value.domain,
        severity: value.severity,
        why: value.rationale,
        recommendation: value.recommendation,
        failureModes: value.failureModes,
        tradeoffs: value.tradeoffs,
        verification: value.verification,
        evidence: value.evidence,
        limitations: value.limitations,
        falsePositiveBoundary: value.falsePositiveBoundary,
        files: value.affectedFiles
      },
      constraints: [
        "Do not self-certify; run prodos verify after changes.",
        "Preserve existing API contracts unless the task requires a change.",
        "Keep source local and avoid unrelated infrastructure."
      ],
      next: "prodos verify --json"
    };
    emit(agentValue, `${value.id}: ${value.title}\n\nWhy: ${value.rationale}\n\nHow it can fail:\n${value.failureModes.map((mode) => `- ${mode}`).join("\n")}\n\nNext: ${value.recommendation}\n\nTradeoffs:\n${value.tradeoffs.map((tradeoff) => `- ${tradeoff}`).join("\n")}\n\nVerify with: ${value.verification.join(", ")}`, args);
    return;
  }
  emit(value, `${definition.id} — ${definition.title}\n\nSeverity: ${definition.severity}\nDomain: ${definition.domain}\n\nWhy it matters:\n${definition.rationale}\n\nHow it can fail:\n${definition.failureModes.map((mode) => `- ${mode}`).join("\n")}\n\nRecommended approach:\n${definition.recommendation}\n\nTradeoffs:\n${definition.tradeoffs.map((tradeoff) => `- ${tradeoff}`).join("\n")}\n\nVerification: ${definition.verification.join(", ")}`, args);
}

async function commandControls(root: string, args: ParsedArgs): Promise<void> {
  const { manifest, discovery, capabilities, snapshot } = await loadAnalysis(root);
  const findings = evaluateControls({ root, manifest, discovery, capabilities, snapshot });
  const relevant = args.flags.has("relevant") ? findings.filter((finding) => finding.status !== "NOT_APPLICABLE") : findings;
  emit({ controls: relevant }, renderFindings(relevant, args.flags.has("verbose")), args);
}

async function commandContext(root: string, args: ParsedArgs): Promise<void> {
  const task = args.values.get("task") ?? args.positional.join(" ");
  if (!task) throw new ProductionOSError("ARGUMENT", "Usage: prodos context --task \"fix checkout\"");
  const { manifest, discovery, capabilities, snapshot } = await loadAnalysis(root);
  const findings = evaluateControls({ root, manifest, discovery, capabilities, snapshot }).filter((finding) => finding.status !== "NOT_APPLICABLE");
  const synonyms: Record<string, string[]> = {
    checkout: ["payment", "payments", "webhook", "idempotency", "authorization"],
    billing: ["payment", "payments", "webhook", "idempotency"],
    login: ["auth", "authentication", "authorization", "session"],
    signin: ["auth", "authentication", "authorization", "session"],
    upload: ["upload", "storage", "file", "authorization"],
    uploads: ["upload", "storage", "file", "authorization"],
    ai: ["ai", "llm", "cost", "prompt", "tool"],
    invite: ["authorization", "tenant", "email", "rate"]
  };
  const stopWords = new Set(["a", "an", "and", "change", "fix", "for", "make", "the", "to", "update", "with"]);
  const words = new Set(task.toLowerCase().split(/[^a-z0-9]+/).filter((word) => word && !stopWords.has(word)));
  for (const word of [...words]) for (const synonym of synonyms[word] ?? []) words.add(synonym);
  const severityRank: Record<string, number> = { critical: 4, high: 3, medium: 2, low: 1 };
  const selected = findings.map((finding) => {
    const searchable = [finding.title, finding.domain, finding.controlId, finding.rationale, finding.recommendation, ...finding.triggeredBy, ...finding.affectedFiles].join(" ").toLowerCase();
    return { finding, score: [...words].filter((word) => searchable.includes(word)).length };
  }).filter((item) => item.score > 0).sort((left, right) => right.score - left.score || (severityRank[right.finding.severity] ?? 0) - (severityRank[left.finding.severity] ?? 0) || left.finding.controlId.localeCompare(right.finding.controlId)).map((item) => item.finding);
  const controls = (selected.length ? selected : findings.filter((finding) => ["critical", "high"].includes(finding.severity))).slice(0, 12);
  const value = { task, controls: controls.map((finding) => finding.controlId), files: [...new Set(controls.flatMap((finding) => finding.affectedFiles))].sort(), constraints: ["Do not self-certify; run prodos verify after changes.", "Preserve existing API contracts unless the task requires a change.", "Keep source local and avoid unrelated infrastructure."], next: "prodos explain <CONTROL_ID>" };
  emit(value, `${TOOL_NAME} context for: ${task}\n\nControls: ${value.controls.join(", ") || "none"}\nFiles: ${value.files.join(", ") || "none"}\n\nConstraints:\n${value.constraints.map((constraint) => `- ${constraint}`).join("\n")}`, args);
}

async function commandEvidence(root: string, args: ParsedArgs): Promise<void> {
  const { snapshot } = await loadAnalysis(root);
  const evidence = await listEvidence(root);
  const value = evidence.map((record) => ({ ...record, fresh: evidenceIsFresh(record, snapshot, record.controlId === "_project" ? undefined : policyVersion()) }));
  emit(value, value.length ? value.map((record) => `${record.fresh ? record.status : "STALE"} ${record.controlId} ${record.method} — ${record.outputSummary}`).join("\n") : "No evidence records.", args);
}

function renderRemediation(plan: RemediationPlan): string {
  return [
    `Remediation ${plan.controlId}`,
    `Status: ${plan.status}`,
    `Risk: ${plan.risk}`,
    "",
    "Preconditions:",
    ...plan.preconditions.map((item) => `- ${item}`),
    "",
    "Changes:",
    ...(plan.changes.length ? plan.changes.map((item) => `- ${item}`) : ["- None"]),
    "",
    "Verification:",
    ...plan.verification.map((item) => `- ${item}`),
    "",
    "Rollback:",
    ...plan.rollback.map((item) => `- ${item}`),
    ...(plan.files.length ? ["", `Files: ${plan.files.join(", ")}`] : [])
  ].join("\n");
}

async function commandFix(root: string, args: ParsedArgs): Promise<void> {
  const id = args.positional[0];
  if (!id) throw new ProductionOSError("ARGUMENT", "Usage: prodos fix <CONTROL_ID> [--apply]");
  const { manifest, discovery, capabilities, snapshot } = await loadAnalysis(root);
  const plan = createRemediationPlan({ root, manifest, discovery, capabilities, snapshot }, id);
  const applied = args.flags.has("apply") ? await applyRemediation(root, plan) : plan;
  emit(applied, renderRemediation(applied), args);
  if (!args.flags.has("apply") && plan.status === "READY") console.error("Plan only. Re-run with --apply after reviewing the generated change and its verification steps.");
}

function renderLoad(report: LoadReport): string {
  return [
    "Local load report",
    "",
    `Target: ${report.url}`,
    `Requests: ${report.requests} at concurrency ${report.concurrency}`,
    `Successes: ${report.successes}`,
    `Failures: ${report.failures}`,
    `Error rate: ${(report.errorRate * 100).toFixed(2)}%`,
    `Throughput: ${report.throughputPerSecond}/s`,
    `Latency: p50 ${report.p50Ms}ms, p95 ${report.p95Ms}ms, p99 ${report.p99Ms}ms`,
    `Saturation: ${report.saturation}`,
    "",
    "Limitations:",
    ...report.limitations.map((limitation) => `- ${limitation}`)
  ].join("\n");
}

async function commandLoad(root: string, args: ParsedArgs): Promise<void> {
  await requireProject(root);
  await ensureStateDirectories(root);
  const url = args.values.get("url");
  if (!url) throw new ProductionOSError("ARGUMENT", "Usage: prodos load --url http://127.0.0.1:3000/health --allow-local");
  if (!args.flags.has("allow-local")) throw new ProductionOSError("LOAD_AUTHORIZATION", "Local load requires --allow-local; ProductionOS does not probe arbitrary hosts.");
  const parseBounded = (name: string, fallback: number): number => {
    const raw = args.values.get(name);
    if (raw === undefined) return fallback;
    const value = Number(raw);
    if (!Number.isInteger(value)) throw new ProductionOSError("ARGUMENT", `--${name} must be an integer.`);
    return value;
  };
  const options: LocalLoadOptions = {
    url,
    requests: parseBounded("requests", 20),
    concurrency: parseBounded("concurrency", 4),
    method: args.values.get("method") ?? "GET",
    timeoutMs: parseBounded("timeout", 5000),
    allowLocal: true
  };
  const body = args.values.get("body");
  if (body !== undefined) options.body = body;
  let report: LoadReport;
  try {
    report = await runLocalLoad(options);
  } catch (error) {
    throw new ProductionOSError("LOAD_INVALID", error instanceof Error ? error.message : String(error));
  }
  const paths = productionOSPaths(root);
  await writeArtifact(join(paths.reports, "load.json"), report);
  const state = await loadState(root);
  await saveState(root, { ...state, currentMilestone: "load", lastCommand: "load", artifacts: [...new Set([...state.artifacts, "reports/load.json"])], nextActions: ["Review measured load output; saturation and production capacity remain unknown."], updatedAt: new Date().toISOString() });
  emit(report, renderLoad(report), args);
}

async function commandSimplify(root: string, args: ParsedArgs): Promise<void> {
  const { manifest, discovery } = await loadAnalysis(root);
  const report = analyzeSimplification(manifest, discovery);
  const paths = productionOSPaths(root);
  await writeArtifact(join(paths.reports, "simplify.json"), report);
  const state = await loadState(root);
  await saveState(root, { ...state, currentMilestone: "simplify", lastCommand: "simplify", artifacts: [...new Set([...state.artifacts, "reports/simplify.json"])], nextActions: report.decision === "REVIEW" ? ["Review simplify candidates before changing dependencies."] : ["No advisory simplification candidate was observed."], updatedAt: new Date().toISOString() });
  emit(report, renderSimplify(report), args);
}

async function commandSlo(root: string, args: ParsedArgs): Promise<void> {
  const { manifest, capabilities } = await loadAnalysis(root);
  const report = buildSloReport(manifest, capabilities);
  const paths = productionOSPaths(root);
  await writeArtifact(join(paths.reports, "slo.json"), report);
  const state = await loadState(root);
  await saveState(root, { ...state, currentMilestone: "slo", lastCommand: "slo", artifacts: [...new Set([...state.artifacts, "reports/slo.json"])], nextActions: ["Treat SLO objectives as unverified until an authorized runtime measurement exists."], updatedAt: new Date().toISOString() });
  emit(report, renderSlo(report), args);
}

function help(): string {
  return [
    `${TOOL_NAME} ${TOOL_VERSION}`,
    "",
    "Usage: prodos <command> [options]",
    "",
    "Commands:",
    "  init                 Create .productionos state and manifest",
    "  inspect              Detect stack, routes, and application capabilities",
    "  status               Show compact durable project state",
    "  controls             List controls (use --relevant)",
    "  context              Create task-scoped agent context",
    "  explain <CONTROL>    Explain a control and its verification contract (use --agent for compact context)",
    "  audit                Evaluate relevant controls without creating evidence",
    "  verify               Create static evidence (use --run-tests explicitly)",
    "  evidence             List evidence and freshness",
    "  gate                 Apply profile policy and return a release decision",
    "  launch               Alias for gate",
    "  fix <CONTROL>        Plan or apply a preconditioned low-risk remediation",
    "  load                 Measure an explicitly authorized loopback endpoint",
    "  simplify             Review dependency and infrastructure complexity without mutation",
    "  slo                  Generate configured and capability-triggered SLO objectives",
    "",
    "Options:",
    "  --root <path>        Inspect another local repository",
    "  --json               Emit machine-readable output",
    "  --quiet              Suppress normal output",
    "  --verbose            Include details and affected files",
    "  --agent              Emit compact agent-oriented control context",
    "  --force              Replace manifest during init",
    "  --apply              Apply a remediation plan after precondition checks",
    "  --run-tests          Run the target repository's npm test command",
    "  --url <url>          Loopback endpoint for load measurement",
    "  --requests <n>       Number of bounded load requests (default 20)",
    "  --concurrency <n>    Concurrent load requests (default 4)",
    "  --method <method>    HTTP method (default GET)",
    "  --body <json>        Optional request body; sets JSON content type",
    "  --timeout <ms>       Per-request timeout (default 5000)",
    "  --allow-local        Explicitly authorize loopback load measurement",
    "  --ci                 CI-compatible flag (gate still returns non-zero when blocked)",
    "  --version            Print the version"
  ].join("\\n");
}

async function run(args: ParsedArgs): Promise<void> {
  if (args.flags.has("version")) { console.log(TOOL_VERSION); return; }
  const root = rootFrom(args);
  switch (args.command) {
    case "help": case "--help": case "-h": console.log(help()); return;
    case "init": await commandInit(root, args); return;
    case "inspect": await commandInspect(root, args); return;
    case "status": await commandStatus(root, args); return;
    case "controls": await commandControls(root, args); return;
    case "context": await commandContext(root, args); return;
    case "explain": await commandExplain(root, args); return;
    case "audit": await commandAudit(root, args); return;
    case "verify": await commandVerify(root, args); return;
    case "evidence": await commandEvidence(root, args); return;
    case "gate": case "launch": await commandGate(root, args); return;
    case "fix": await commandFix(root, args); return;
    case "load": await commandLoad(root, args); return;
    case "simplify": await commandSimplify(root, args); return;
    case "slo": await commandSlo(root, args); return;
    case "attack": case "watch":
      throw new ProductionOSError("UNSUPPORTED_COMMAND", `'${args.command}' is planned but not implemented; no fake result is produced.`);
    default: throw new ProductionOSError("UNKNOWN_COMMAND", `Unknown command '${args.command}'.\n\n${help()}`);
  }
}

const args = parseArgs(process.argv.slice(2));
run(args).catch((error: unknown) => {
  const productionError = error instanceof ProductionOSError ? error : new ProductionOSError("UNEXPECTED", error instanceof Error ? error.message : String(error));
  if (wantsJson(args)) console.error(JSON.stringify({ error: productionError.code, message: productionError.message }));
  else console.error(`ProductionOS error [${productionError.code}]\n${productionError.message}`);
  process.exitCode = productionError.exitCode;
});
