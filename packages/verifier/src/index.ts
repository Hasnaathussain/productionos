import { spawn } from "node:child_process";
import { readFile } from "node:fs/promises";
import { EVIDENCE_SCHEMA_VERSION, type ControlFinding, type EvidenceRecord, type EvaluationContext } from "../../../packages/core/src/index.js";
import { evidenceIdForControl, filesForHints, fingerprintForFiles } from "../../../packages/evidence/src/index.js";
import { verifyStaticControls } from "../../../packages/policy/src/index.js";

export interface StaticVerificationResult {
  findings: ControlFinding[];
  evidence: EvidenceRecord[];
}

export function verifyStatic(context: EvaluationContext, findings: ControlFinding[]): StaticVerificationResult {
  const verifiedFindings = verifyStaticControls(context, findings);
  const completedAt = new Date().toISOString();
  const evidence: EvidenceRecord[] = [];
  for (const finding of verifiedFindings) {
    if (finding.status === "NOT_APPLICABLE" || finding.status === "WAIVED" || finding.status === "STALE") continue;
    const affectedFiles = [...new Set([...finding.affectedFiles, ...filesForHints(context.snapshot, finding.affectedFiles)])].sort();
    evidence.push({
      schemaVersion: EVIDENCE_SCHEMA_VERSION,
      evidenceId: evidenceIdForControl(finding.controlId, "static"),
      controlId: finding.controlId,
      controlVersion: finding.version,
      status: finding.status,
      method: "static",
      command: ["prodos", "verify", "--static", finding.controlId],
      workingDirectory: context.root,
      exitCode: finding.status === "STATICALLY_VERIFIED" ? 0 : finding.status === "FAILED" ? 1 : null,
      startedAt: completedAt,
      completedAt,
      affectedFiles,
      inputFingerprint: fingerprintForFiles(context.snapshot, filesForHints(context.snapshot, affectedFiles)),
      outputSummary: finding.summary,
      limitations: finding.status === "STATICALLY_VERIFIED" ? ["Static verification proves the checked source property, not all runtime behavior."] : ["No passing deterministic static proof was available."]
    });
  }
  return { findings: verifiedFindings, evidence };
}

export interface ProcessResult {
  command: string[];
  exitCode: number | null;
  output: string;
  startedAt: string;
  completedAt: string;
}

export function testCommandForPackageManager(packageManager: string, platform = process.platform): string[] {
  const executable = new Set(["npm", "pnpm", "yarn", "bun"]).has(packageManager) ? packageManager : "npm";
  if (platform === "win32") return [process.env.ComSpec ?? "cmd.exe", "/d", "/s", "/c", `${executable}.cmd test`];
  return [executable, "test"];
}

export async function runProjectTests(root: string, packageManager = "npm"): Promise<ProcessResult> {
  const startedAt = new Date().toISOString();
  const command = testCommandForPackageManager(packageManager);
  const output: string[] = [];
  const result = await new Promise<number | null>((resolve) => {
    const child = spawn(command[0] as string, command.slice(1), { cwd: root, shell: false, env: { ...process.env, CI: "1" } });
    child.stdout.on("data", (chunk: Buffer) => output.push(chunk.toString()));
    child.stderr.on("data", (chunk: Buffer) => output.push(chunk.toString()));
    child.on("error", (error) => { output.push(error.message); resolve(null); });
    child.on("close", (code) => resolve(code));
  });
  return { command, exitCode: result, output: output.join("").slice(-20000), startedAt, completedAt: new Date().toISOString() };
}

export function projectTestEvidence(context: EvaluationContext, result: ProcessResult): EvidenceRecord {
  const affectedFiles = ["package.json", "src", "app", "pages", "test", "tests"];
  return {
    schemaVersion: EVIDENCE_SCHEMA_VERSION,
    evidenceId: evidenceIdForControl("_project", "test"),
    controlId: "_project",
    controlVersion: "1",
    status: result.exitCode === 0 ? "TEST_VERIFIED" : "FAILED",
    method: "test",
    command: result.command,
    workingDirectory: context.root,
    exitCode: result.exitCode,
    startedAt: result.startedAt,
    completedAt: result.completedAt,
    affectedFiles,
    inputFingerprint: fingerprintForFiles(context.snapshot, filesForHints(context.snapshot, affectedFiles)),
    outputSummary: result.exitCode === 0 ? "Repository test command passed." : "Repository test command did not pass.",
    output: result.output,
    limitations: ["A project test result is not automatically proof for every ProductionOS control."]
  };
}

export function controlTestEvidence(context: EvaluationContext, findings: ControlFinding[], result: ProcessResult): EvidenceRecord[] {
  if (result.exitCode !== 0) return [];
  const testFiles = context.snapshot.files.filter((file) => /(?:^|\/)(?:test|tests|__tests__)\//.test(file.path) || /\.(?:test|spec)\./.test(file.path));
  return findings.filter((finding) => testFiles.some((file) => file.path.toLowerCase().includes(finding.controlId.toLowerCase()))).map((finding) => {
    const affectedFiles = [finding.controlId, ...finding.affectedFiles, ...testFiles.filter((file) => file.path.toLowerCase().includes(finding.controlId.toLowerCase())).map((file) => file.path)];
    return {
      schemaVersion: EVIDENCE_SCHEMA_VERSION,
      evidenceId: evidenceIdForControl(finding.controlId, "test"),
      controlId: finding.controlId,
      controlVersion: finding.version,
      status: "TEST_VERIFIED" as const,
      method: "test" as const,
      command: result.command,
      workingDirectory: context.root,
      exitCode: result.exitCode,
      startedAt: result.startedAt,
      completedAt: result.completedAt,
      affectedFiles,
      inputFingerprint: fingerprintForFiles(context.snapshot, filesForHints(context.snapshot, affectedFiles)),
      outputSummary: `Passing test command includes a control-specific test for ${finding.controlId}.`,
      output: result.output,
      limitations: ["The test naming convention links execution to the control; the test itself remains the source of behavioral coverage."]
    };
  });
}
