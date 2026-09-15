import test from "node:test";
import assert from "node:assert/strict";
import { applyWaivers, computeGate, mergeEvidenceStatuses } from "./index.js";
import type { ControlFinding, EvidenceRecord, ProjectManifest } from "../../../packages/core/src/index.js";

const manifest: ProjectManifest = { version: 1, project: { type: "saas", maturity: "saas" } };
const finding: ControlFinding = {
  controlId: "SEC-AUTHZ-001",
  version: "1.0.0",
  title: "Authorization",
  domain: "authorization",
  severity: "critical",
  status: "INFERRED",
  summary: "Needs proof",
  rationale: "Access must be scoped.",
  recommendation: "Test it.",
  verification: ["static", "test"],
  affectedFiles: ["app"],
  triggeredBy: ["authorization"],
  evaluatedAt: new Date().toISOString()
};

test("fresh evidence promotes a finding and stale evidence blocks it", () => {
  const snapshot = { root: ".", files: [{ path: "app/route.ts", content: "", hash: "a" }], fingerprint: "", truncated: false };
  const evidence: EvidenceRecord = {
    schemaVersion: 1,
    evidenceId: "authz-static",
    controlId: finding.controlId,
    controlVersion: "1.0.0",
    status: "STATICALLY_VERIFIED",
    method: "static",
    command: ["prodos", "verify"],
    workingDirectory: ".",
    exitCode: 0,
    startedAt: new Date().toISOString(),
    completedAt: new Date().toISOString(),
    affectedFiles: ["app"],
    inputFingerprint: "a",
    outputSummary: "Verified",
    limitations: []
  };
  assert.equal(mergeEvidenceStatuses([finding], [evidence], () => true)[0]?.status, "STATICALLY_VERIFIED");
  assert.equal(mergeEvidenceStatuses([finding], [evidence], () => false)[0]?.status, "STALE");
  assert.equal(snapshot.files[0]?.hash, "a");
});

test("changed control versions invalidate otherwise fresh evidence", () => {
  const evidence: EvidenceRecord = {
    schemaVersion: 1,
    evidenceId: "authz-old-version",
    controlId: finding.controlId,
    controlVersion: "0.9.0",
    status: "STATICALLY_VERIFIED",
    method: "static",
    command: ["prodos", "verify"],
    workingDirectory: ".",
    exitCode: 0,
    startedAt: new Date().toISOString(),
    completedAt: new Date().toISOString(),
    affectedFiles: ["app"],
    inputFingerprint: "a",
    outputSummary: "Old proof",
    limitations: []
  };
  const merged = mergeEvidenceStatuses([finding], [evidence], () => true);
  assert.equal(merged[0]?.status, "STALE");
  assert.match(merged[0]?.summary ?? "", /control definition changed/);

  const currentVersionEvidence = { ...evidence, evidenceId: "authz-current-version", controlVersion: finding.version };
  const policyChanged = mergeEvidenceStatuses([finding], [currentVersionEvidence], () => true, "2.0.0");
  assert.equal(policyChanged[0]?.status, "STALE");
});

test("gate evidence counts use current finding statuses, not stale records", () => {
  const stale = { ...finding, status: "STALE" as const };
  const evidence: EvidenceRecord = {
    schemaVersion: 1,
    evidenceId: "authz-stale",
    controlId: finding.controlId,
    controlVersion: finding.version,
    status: "STATICALLY_VERIFIED",
    method: "static",
    command: ["prodos", "verify"],
    workingDirectory: ".",
    exitCode: 0,
    startedAt: new Date().toISOString(),
    completedAt: new Date().toISOString(),
    affectedFiles: ["app"],
    inputFingerprint: "old",
    outputSummary: "Old proof",
    limitations: []
  };
  const gate = computeGate(manifest, [stale], [evidence], []);
  assert.equal(gate.evidence.staticVerified, 0);
  assert.equal(gate.evidence.stale, 1);
});

test("waivers are visible and unblock only the explicitly waived control", () => {
  const waived = applyWaivers([finding], [{ control: finding.controlId, reason: "Private beta", owner: "owner" }]);
  assert.equal(waived[0]?.status, "WAIVED");
  const gate = computeGate(manifest, waived, [], [{ control: finding.controlId, reason: "Private beta", owner: "owner" }]);
  assert.equal(gate.decision, "PASS");
  assert.equal(gate.waivers[0]?.owner, "owner");
});

test("profile changes alter the blocking severity boundary", () => {
  const high: ControlFinding = { ...finding, controlId: "SEC-HEADERS-001", severity: "high", status: "FAILED" };
  assert.equal(computeGate({ ...manifest, project: { ...manifest.project, maturity: "prototype" } }, [high], [], []).decision, "PASS");
  assert.equal(computeGate({ ...manifest, project: { ...manifest.project, maturity: "public" } }, [high], [], []).decision, "BLOCKED");
});

test("fresh failure remains visible when another verifier passes", () => {
  const failed: EvidenceRecord = {
    schemaVersion: 1,
    evidenceId: "authz-static-failed",
    controlId: finding.controlId,
    controlVersion: "1.0.0",
    status: "FAILED",
    method: "static",
    command: ["prodos", "verify"],
    workingDirectory: ".",
    exitCode: 1,
    startedAt: new Date().toISOString(),
    completedAt: new Date().toISOString(),
    affectedFiles: ["app"],
    inputFingerprint: "a",
    outputSummary: "Static authorization boundary is missing.",
    limitations: []
  };
  const passed: EvidenceRecord = {
    ...failed,
    evidenceId: "authz-test-passed",
    status: "TEST_VERIFIED",
    method: "test",
    exitCode: 0,
    outputSummary: "Control-specific test passed."
  };
  const merged = mergeEvidenceStatuses([finding], [passed, failed], () => true);
  assert.equal(merged[0]?.status, "FAILED");
  assert.equal(merged[0]?.summary, "Static authorization boundary is missing.");
});

test("current audit failures remain visible beside stale historical proof", () => {
  const failed = { ...finding, status: "FAILED" as const, summary: "Current static check failed." };
  const oldEvidence: EvidenceRecord = {
    schemaVersion: 1,
    evidenceId: "authz-old-input",
    controlId: finding.controlId,
    controlVersion: finding.version,
    status: "STATICALLY_VERIFIED",
    method: "static",
    command: ["prodos", "verify"],
    workingDirectory: ".",
    exitCode: 0,
    startedAt: new Date().toISOString(),
    completedAt: new Date().toISOString(),
    affectedFiles: ["app"],
    inputFingerprint: "old",
    outputSummary: "Historical proof",
    limitations: []
  };
  const merged = mergeEvidenceStatuses([failed], [oldEvidence], () => false);
  assert.equal(merged[0]?.status, "FAILED");
  assert.equal(merged[0]?.summary, "Current static check failed.");
});
