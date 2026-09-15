import type { ControlFinding, ControlStatus, EvidenceRecord, GateResult, MaturityProfile, ProjectManifest, Waiver } from "../../../packages/core/src/index.js";

const STATUS_ORDER: ControlStatus[] = ["RUNTIME_VERIFIED", "TEST_VERIFIED", "STATICALLY_VERIFIED", "WAIVED", "INFERRED", "UNASSESSED", "FAILED", "STALE", "NOT_APPLICABLE"];
const BLOCKING_BY_PROFILE: Record<MaturityProfile, SeveritySet> = {
  prototype: new Set(["critical"]),
  public: new Set(["critical", "high"]),
  saas: new Set(["critical", "high"]),
  business_critical: new Set(["critical", "high", "medium"]),
  regulated: new Set(["critical", "high", "medium", "low"])
};
type SeveritySet = Set<"critical" | "high" | "medium" | "low">;

export function countStatuses(findings: ControlFinding[]): Record<ControlStatus, number> {
  const counts = Object.fromEntries(STATUS_ORDER.map((status) => [status, 0])) as Record<ControlStatus, number>;
  for (const finding of findings) counts[finding.status] += 1;
  return counts;
}

export function mergeEvidenceStatuses(findings: ControlFinding[], evidence: EvidenceRecord[], fresh: (record: EvidenceRecord) => boolean, currentControlVersion?: string): ControlFinding[] {
  const byControl = new Map<string, EvidenceRecord[]>();
  for (const record of evidence) {
    const current = byControl.get(record.controlId) ?? [];
    current.push(record);
    byControl.set(record.controlId, current);
  }
  return findings.map((finding) => {
    if (finding.status === "NOT_APPLICABLE") return finding;
    const records = byControl.get(finding.controlId) ?? [];
    const expectedVersion = currentControlVersion ?? finding.version;
    const compatible = records.filter((record) => record.controlVersion === expectedVersion);
    const current = compatible.filter(fresh).sort((left, right) => STATUS_ORDER.indexOf(left.status) - STATUS_ORDER.indexOf(right.status));
    const stale = records.length > 0 && current.length === 0;
    if (stale) {
      if (finding.status === "FAILED") return finding;
      return { ...finding, status: "STALE" as const, summary: compatible.length === 0 ? "Verification evidence is stale because the control definition changed." : "Verification evidence is stale because relevant inputs changed." };
    }
    const failure = current.find((record) => record.status === "FAILED");
    if (failure) return { ...finding, status: "FAILED" as const, summary: failure.outputSummary };
    const best = current[0];
    if (!best) return finding;
    return { ...finding, status: best.status, summary: best.outputSummary };
  });
}

function waiverIsActive(waiver: Waiver, now = new Date()): boolean {
  return !waiver.expires || new Date(`${waiver.expires}T23:59:59.999Z`) >= now;
}

export function applyWaivers(findings: ControlFinding[], waivers: Waiver[], now = new Date()): ControlFinding[] {
  const active = new Set(waivers.filter((waiver) => waiverIsActive(waiver, now)).map((waiver) => waiver.control.toLowerCase()));
  return findings.map((finding) => active.has(finding.controlId.toLowerCase()) && finding.status !== "NOT_APPLICABLE" ? { ...finding, status: "WAIVED", summary: "Accepted by an explicit repository waiver." } : finding);
}

export function computeGate(manifest: ProjectManifest, findings: ControlFinding[], evidence: EvidenceRecord[], waivers: Waiver[]): GateResult {
  const counts = countStatuses(findings);
  const blocking = findings.filter((finding) => BLOCKING_BY_PROFILE[manifest.project.maturity].has(finding.severity) && ["FAILED", "UNASSESSED", "INFERRED", "STALE"].includes(finding.status));
  return {
    profile: manifest.project.maturity,
    decision: blocking.length ? "BLOCKED" : "PASS",
    generatedAt: new Date().toISOString(),
    counts,
    blocking,
    waivers: waivers.filter((waiver) => waiverIsActive(waiver)),
    evidence: {
      staticVerified: findings.filter((finding) => finding.status === "STATICALLY_VERIFIED").length,
      testVerified: findings.filter((finding) => finding.status === "TEST_VERIFIED").length,
      runtimeVerified: findings.filter((finding) => finding.status === "RUNTIME_VERIFIED").length,
      stale: counts.STALE
    }
  };
}

export function renderFindings(findings: ControlFinding[], verbose = false): string {
  const lines = ["ProductionOS audit", ""];
  for (const finding of findings.filter((finding) => finding.status !== "NOT_APPLICABLE")) {
    lines.push(`${finding.status.padEnd(21)} ${finding.severity.toUpperCase().padEnd(8)} ${finding.controlId}  ${finding.title}`);
    lines.push(`  ${finding.summary}`);
    if (verbose) {
      lines.push(`  Why: ${finding.rationale}`);
      lines.push(`  Next: ${finding.recommendation}`);
      if (finding.affectedFiles.length) lines.push(`  Files: ${finding.affectedFiles.join(", ")}`);
    }
  }
  if (lines.length === 2) lines.push("No active controls.");
  return lines.join("\n");
}

export function renderGate(gate: GateResult): string {
  const lines = ["Production Gate", "", `Profile: ${gate.profile}`, "", `Decision: ${gate.decision}`, "", "Counts:"];
  for (const status of STATUS_ORDER) {
    const count = gate.counts[status];
    if (count) lines.push(`  ${status.padEnd(21)} ${count}`);
  }
  lines.push("", `Evidence: static ${gate.evidence.staticVerified}, test ${gate.evidence.testVerified}, runtime ${gate.evidence.runtimeVerified}, stale ${gate.evidence.stale}`);
  if (gate.blocking.length) {
    lines.push("", "Blocking controls:");
    for (const finding of gate.blocking) lines.push(`  ${finding.controlId} ${finding.title}: ${finding.summary}`);
  }
  if (gate.waivers.length) {
    lines.push("", "Active waivers:");
    for (const waiver of gate.waivers) lines.push(`  ${waiver.control} — ${waiver.reason} (${waiver.owner})`);
  }
  return lines.join("\n");
}

export function renderLaunch(gate: GateResult): string {
  const lines = ["Can I launch?", "", gate.decision === "PASS" ? "YES" : "NO", "", `Profile: ${gate.profile}`];
  if (gate.decision === "PASS") lines.push("", "No profile-blocking controls remain unresolved.");
  else {
    lines.push("", "Blocking controls:");
    for (const finding of gate.blocking) lines.push(`  ${finding.controlId} ${finding.title}: ${finding.summary}`);
  }
  if (gate.waivers.length) lines.push("", `Accepted waivers: ${gate.waivers.length}`);
  return lines.join("\n");
}

export function renderStatus(state: { currentMilestone: string; updatedAt: string; summary: { framework: string | null; capabilities: string[]; unresolvedControls: number; failedControls: number; staleEvidence: number }; blockers: string[]; nextActions: string[] }): string {
  return [
    "ProductionOS status",
    "",
    `Milestone: ${state.currentMilestone}`,
    `Framework: ${state.summary.framework ?? "unknown"}`,
    `Capabilities: ${state.summary.capabilities.length ? state.summary.capabilities.join(", ") : "none detected"}`,
    `Unresolved controls: ${state.summary.unresolvedControls}`,
    `Failed controls: ${state.summary.failedControls}`,
    `Stale evidence: ${state.summary.staleEvidence}`,
    `Updated: ${state.updatedAt}`,
    ...(state.blockers.length ? ["", "Blockers:", ...state.blockers.map((blocker) => `- ${blocker}`)] : []),
    ...(state.nextActions.length ? ["", "Next:", ...state.nextActions.map((action) => `- ${action}`)] : [])
  ].join("\n");
}
