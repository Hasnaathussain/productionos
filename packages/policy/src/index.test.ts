import test from "node:test";
import assert from "node:assert/strict";
import { mkdir, mkdtemp, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { tmpdir } from "node:os";
import { loadRepositorySnapshot } from "../../../packages/core/src/index.js";
import { defaultManifest } from "../../../packages/manifest/src/index.js";
import { discoverRepository } from "../../../packages/discovery/src/index.js";
import { buildCapabilityGraph } from "../../../packages/graph/src/index.js";
import { evaluateControls, requirementsForCapabilities, verifyStaticControls } from "./index.js";

const fixture = resolve(dirname(fileURLToPath(import.meta.url)), "../../../../fixtures/nextjs-saas");
const agentFixture = resolve(dirname(fileURLToPath(import.meta.url)), "../../../../fixtures/agentic-next");
const safeAgentFixture = resolve(dirname(fileURLToPath(import.meta.url)), "../../../../fixtures/agentic-safe");
const uploadFixture = resolve(dirname(fileURLToPath(import.meta.url)), "../../../../fixtures/upload-safe");
const backupFixture = resolve(dirname(fileURLToPath(import.meta.url)), "../../../../fixtures/backup-described");
const migrationFixture = resolve(dirname(fileURLToPath(import.meta.url)), "../../../../fixtures/migration-unsafe");

test("policy activates controls from capabilities and preserves failures", async () => {
  const discovery = await discoverRepository(fixture);
  const capabilities = buildCapabilityGraph(discovery);
  const context = { root: fixture, manifest: defaultManifest(), discovery, capabilities, snapshot: await loadRepositorySnapshot(fixture) };
  const findings = evaluateControls(context);
  const webhook = findings.find((finding) => finding.controlId === "SEC-WEBHOOK-001");
  const upload = findings.find((finding) => finding.controlId === "SEC-UPLOAD-001");
  assert.equal(webhook?.status, "FAILED");
  assert.equal(upload?.status, "NOT_APPLICABLE");
  assert.equal(findings.find((finding) => finding.controlId === "AI-TOOL-001")?.status, "NOT_APPLICABLE");
  assert.equal(findings.find((finding) => finding.controlId === "OPS-BACKUP-001")?.status, "UNASSESSED");
  assert.equal(findings.find((finding) => finding.controlId === "DB-MIGRATION-001")?.status, "UNASSESSED");
  assert.ok(findings.length >= 30);
});

test("static verification promotes only passing checks", async () => {
  const discovery = await discoverRepository(fixture);
  const capabilities = buildCapabilityGraph(discovery);
  const context = { root: fixture, manifest: defaultManifest(), discovery, capabilities, snapshot: await loadRepositorySnapshot(fixture) };
  const verified = verifyStaticControls(context, evaluateControls(context));
  assert.equal(verified.find((finding) => finding.controlId === "SEC-SECRET-001")?.status, "STATICALLY_VERIFIED");
  assert.equal(verified.find((finding) => finding.controlId === "SEC-WEBHOOK-001")?.status, "FAILED");
});

test("requirement graph records activation and control dependencies", async () => {
  const discovery = await discoverRepository(fixture);
  const capabilities = buildCapabilityGraph(discovery);
  const graph = requirementsForCapabilities(capabilities);
  assert.equal(graph.schemaVersion, 3);
  assert.ok(graph.edges.some((edge) => edge.from === "payments" && edge.kind === "activates"));
  assert.ok(graph.edges.some((edge) => edge.from === "SEC-WEBHOOK-001" && edge.to === "SEC-WEBHOOK-002" && edge.kind === "depends_on"));
  const authorization = graph.requirements.find((requirement) => requirement.id === "SEC-AUTHZ-001");
  assert.ok(authorization?.evidence.some((item) => item.artifact === "source_reference"));
  assert.ok(authorization?.limitations.length);
  assert.match(authorization?.falsePositiveBoundary ?? "", /indicator/);
  assert.ok(authorization?.failureModes.length);
  assert.ok(authorization?.tradeoffs.length);
});

test("agent tool operations activate an explicit permission control", async () => {
  const discovery = await discoverRepository(agentFixture);
  const capabilities = buildCapabilityGraph(discovery);
  const context = { root: agentFixture, manifest: defaultManifest(), discovery, capabilities, snapshot: await loadRepositorySnapshot(agentFixture) };
  assert.ok(capabilities.nodes.some((node) => node.id === "agentic_operations"));
  assert.equal(evaluateControls(context).find((finding) => finding.controlId === "AI-TOOL-001")?.status, "FAILED");
});

test("explicit agent allowlists satisfy the permission control", async () => {
  const discovery = await discoverRepository(safeAgentFixture);
  const capabilities = buildCapabilityGraph(discovery);
  const context = { root: safeAgentFixture, manifest: defaultManifest(), discovery, capabilities, snapshot: await loadRepositorySnapshot(safeAgentFixture) };
  assert.equal(evaluateControls(context).find((finding) => finding.controlId === "AI-TOOL-001")?.status, "INFERRED");
});

test("safe upload boundaries activate and satisfy upload controls", async () => {
  const discovery = await discoverRepository(uploadFixture);
  const capabilities = buildCapabilityGraph(discovery);
  const context = { root: uploadFixture, manifest: defaultManifest(), discovery, capabilities, snapshot: await loadRepositorySnapshot(uploadFixture) };
  const findings = evaluateControls(context);
  assert.ok(capabilities.nodes.some((node) => node.id === "file_uploads"));
  assert.ok(capabilities.nodes.some((node) => node.id === "object_storage"));
  assert.ok(discovery.signals.authorization);
  assert.equal(findings.find((finding) => finding.controlId === "SEC-UPLOAD-001")?.status, "INFERRED");
  assert.equal(findings.find((finding) => finding.controlId === "SEC-UPLOAD-002")?.status, "INFERRED");
  assert.equal(findings.find((finding) => finding.controlId === "DB-QUERY-001")?.status, "INFERRED");
  assert.equal(findings.find((finding) => finding.controlId === "SEC-SSRF-001")?.status, "INFERRED");
});

test("adjacent signals do not satisfy distinct control boundaries", async () => {
  const source = await discoverRepository(fixture);
  const signals = { ...source.signals };
  signals.structured_logging = { files: ["app/api/generate/route.ts"], matches: 1 };
  signals.input_validation = { files: ["app/api/generate/route.ts"], matches: 1 };
  signals.ai_payload_bounds = { files: ["app/api/generate/route.ts"], matches: 1 };
  delete signals.sensitive_log_redaction;
  delete signals.query_bounds;
  delete signals.outbound_target_validation;
  delete signals.ai_quota;
  const discovery = { ...source, signals };
  const capabilities = buildCapabilityGraph(discovery);
  const context = { root: fixture, manifest: defaultManifest(), discovery, capabilities, snapshot: await loadRepositorySnapshot(fixture) };
  const findings = evaluateControls(context);
  assert.equal(findings.find((finding) => finding.controlId === "OBS-REDACT-001")?.status, "FAILED");
  assert.equal(findings.find((finding) => finding.controlId === "DB-QUERY-001")?.status, "FAILED");
  assert.equal(findings.find((finding) => finding.controlId === "SEC-SSRF-001")?.status, "FAILED");
  assert.equal(findings.find((finding) => finding.controlId === "COST-AI-001")?.status, "FAILED");
  assert.equal(findings.find((finding) => finding.controlId === "COST-AI-002")?.status, "INFERRED");
});

test("backup runbooks expose readiness fields without becoming restore proof", async () => {
  const discovery = await discoverRepository(backupFixture);
  const capabilities = buildCapabilityGraph(discovery);
  const context = { root: backupFixture, manifest: defaultManifest(), discovery, capabilities, snapshot: await loadRepositorySnapshot(backupFixture) };
  const backup = evaluateControls(context).find((finding) => finding.controlId === "OPS-BACKUP-001");
  assert.ok(discovery.signals.backup_configured);
  assert.ok(discovery.signals.restore_documented);
  assert.ok(discovery.signals.backup_freshness);
  assert.ok(discovery.signals.recovery_objective);
  assert.equal(discovery.signals.restore_tested, undefined);
  assert.equal(backup?.status, "UNASSESSED");
  assert.match(backup?.summary ?? "", /freshness: observed/);
  assert.match(backup?.summary ?? "", /recovery objective: observed/);
});

test("migration risk is surfaced as a failure requiring staged review", async () => {
  const discovery = await discoverRepository(migrationFixture);
  const capabilities = buildCapabilityGraph(discovery);
  const context = { root: migrationFixture, manifest: defaultManifest(), discovery, capabilities, snapshot: await loadRepositorySnapshot(migrationFixture) };
  const migration = evaluateControls(context).find((finding) => finding.controlId === "DB-MIGRATION-001");
  assert.ok(discovery.signals.migration_surface);
  assert.ok(discovery.signals.migration_risk);
  assert.equal(migration?.status, "FAILED");
  assert.match(migration?.summary ?? "", /destructive or non-null/);
});

test("a migration surface without a recognized risky operation remains unassessed", async () => {
  const root = await mkdtemp(resolve(tmpdir(), "productionos-migration-safe-"));
  const migrationDirectory = resolve(root, "prisma/migrations/20260914_add_profile");
  await mkdir(migrationDirectory, { recursive: true });
  await writeFile(resolve(root, "package.json"), JSON.stringify({ dependencies: { "@prisma/client": "5.22.0" } }), "utf8");
  await writeFile(resolve(migrationDirectory, "migration.sql"), "ALTER TABLE users ADD COLUMN profile JSONB;\n", "utf8");
  const discovery = await discoverRepository(root);
  const capabilities = buildCapabilityGraph(discovery);
  const context = { root, manifest: defaultManifest(), discovery, capabilities, snapshot: await loadRepositorySnapshot(root) };
  const migration = evaluateControls(context).find((finding) => finding.controlId === "DB-MIGRATION-001");
  assert.ok(discovery.signals.migration_surface);
  assert.equal(discovery.signals.migration_risk, undefined);
  assert.equal(migration?.status, "UNASSESSED");
  assert.match(migration?.summary ?? "", /rollout safety is unverified/);
});
