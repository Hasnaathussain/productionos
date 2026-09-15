import assert from "node:assert/strict";
import { cp, mkdtemp, readFile, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { tmpdir } from "node:os";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const cli = resolve(root, "dist/apps/cli/src/main.js");
const cases = JSON.parse(await readFile(resolve(root, "benchmarks/cases.json"), "utf8"));

function run(args, cwd) {
  const result = spawnSync(process.execPath, [cli, ...args, "--root", cwd, "--json"], { cwd: root, encoding: "utf8" });
  assert.equal(result.status, 0, `${args.join(" ")} failed:\n${result.stderr}`);
  return JSON.parse(result.stdout);
}

const results = [];
for (const benchmark of cases) {
  const target = await mkdtemp(join(tmpdir(), `productionos-benchmark-${benchmark.name}-`));
  await cp(resolve(root, benchmark.fixture), target, { recursive: true, filter: (source) => !source.includes(".productionos") && !source.includes("node_modules") });
  run(["init"], target);
  run(["inspect"], target);
  const audit = run(["audit"], target);
  const byId = new Map(audit.findings.map((finding) => [finding.controlId, finding]));
  const missed = benchmark.expectedFailed.filter((id) => byId.get(id)?.status !== "FAILED");
  const falsePositive = benchmark.expectedNotApplicable.filter((id) => byId.get(id)?.status !== "NOT_APPLICABLE");
  const detected = benchmark.expectedFailed.length - missed.length;
  let remediation = { expected: 0, detected: 0, missed: [] };
  let verification = { expected: 0, detected: 0, missed: [] };
  let regression = { expected: 0, detected: 0, missed: [], staleEvidence: false };

  if (benchmark.remediation) {
    const plan = run(["fix", benchmark.remediation.controlId, "--apply"], target);
    run(["inspect"], target);
    const remediatedAudit = run(["audit"], target);
    const remediatedFinding = remediatedAudit.findings.find((finding) => finding.controlId === benchmark.remediation.controlId);
    remediation = {
      expected: 1,
      detected: plan.status === "APPLIED" && remediatedFinding?.status === "INFERRED" ? 1 : 0,
      missed: plan.status === "APPLIED" && remediatedFinding?.status === "INFERRED" ? [] : [benchmark.remediation.controlId]
    };

    const verified = run(["verify"], target);
    const verifiedFinding = verified.findings.find((finding) => finding.controlId === benchmark.remediation.controlId);
    remediation.detected = verifiedFinding?.status === benchmark.remediation.expectedStatus ? 1 : 0;
    remediation.missed = verifiedFinding?.status === benchmark.remediation.expectedStatus ? [] : [benchmark.remediation.controlId];
  }

  if (benchmark.verification?.runTests) {
    const verified = run(["verify", "--run-tests"], target);
    const expected = benchmark.verification.expectedTestVerified ?? [];
    const verificationMissed = expected.filter((id) => verified.findings.find((finding) => finding.controlId === id)?.status !== "TEST_VERIFIED");
    verification = { expected: expected.length, detected: expected.length - verificationMissed.length, missed: verificationMissed };
  }

  if (benchmark.regression) {
    await writeFile(join(target, benchmark.regression.file), benchmark.regression.content, "utf8");
    run(["inspect"], target);
    const stale = run(["evidence"], target);
    const staleEvidence = stale.some((record) => record.controlId === benchmark.regression.controlId && record.fresh === false);
    const regressedAudit = run(["audit"], target);
    const regressedFinding = regressedAudit.findings.find((finding) => finding.controlId === benchmark.regression.controlId);
    const detectedRegression = regressedFinding?.status === benchmark.regression.expectedStatus && (!benchmark.regression.requiresStaleEvidence || staleEvidence);
    regression = { expected: 1, detected: detectedRegression ? 1 : 0, missed: detectedRegression ? [] : [benchmark.regression.controlId], staleEvidence };
  }

  results.push({ name: benchmark.name, detected, expected: benchmark.expectedFailed.length, missed, falsePositive, activeControls: audit.findings.filter((finding) => finding.status !== "NOT_APPLICABLE").length, remediation, verification, regression });
}

const sumMetric = (metric, field) => results.reduce((sum, result) => sum + result[metric][field], 0);
const report = {
  schemaVersion: 2,
  generatedAt: new Date().toISOString(),
  cases: results,
  totals: {
    detected: results.reduce((sum, result) => sum + result.detected, 0),
    expected: results.reduce((sum, result) => sum + result.expected, 0),
    missed: results.reduce((sum, result) => sum + result.missed.length, 0),
    falsePositive: results.reduce((sum, result) => sum + result.falsePositive.length, 0),
    remediationDetected: sumMetric("remediation", "detected"),
    remediationExpected: sumMetric("remediation", "expected"),
    remediationMissed: results.reduce((sum, result) => sum + result.remediation.missed.length, 0),
    verificationDetected: sumMetric("verification", "detected"),
    verificationExpected: sumMetric("verification", "expected"),
    verificationMissed: results.reduce((sum, result) => sum + result.verification.missed.length, 0),
    regressionDetected: sumMetric("regression", "detected"),
    regressionExpected: sumMetric("regression", "expected"),
    regressionMissed: results.reduce((sum, result) => sum + result.regression.missed.length, 0),
    staleEvidenceChecks: results.filter((result) => result.regression.staleEvidence).length
  }
};
await writeFile(resolve(root, "benchmarks/results.json"), `${JSON.stringify(report, null, 2)}\n`, "utf8");
console.log(JSON.stringify(report, null, 2));
if (report.totals.missed || report.totals.falsePositive || report.totals.remediationMissed || report.totals.verificationMissed || report.totals.regressionMissed) process.exitCode = 1;
