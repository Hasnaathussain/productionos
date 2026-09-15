import assert from "node:assert/strict";
import { cp, mkdtemp } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { tmpdir } from "node:os";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const cli = resolve(root, "dist/apps/cli/src/main.js");
const fixture = resolve(root, "fixtures/nextjs-saas");
const target = await mkdtemp(join(tmpdir(), "productionos-demo-"));

await cp(fixture, target, { recursive: true, filter: (source) => !source.includes(".productionos") && !source.includes("node_modules") });

function run(args, expectedStatus = 0) {
  const result = spawnSync(process.execPath, [cli, ...args, "--root", target, "--json"], { cwd: root, encoding: "utf8" });
  assert.equal(result.status, expectedStatus, `${args.join(" ")} failed with ${result.status}:\n${result.stderr}`);
  return JSON.parse(result.stdout);
}

run(["init"]);
run(["inspect"]);
const audit = run(["audit"]);
const verification = run(["verify", "--run-tests"]);
const evidence = run(["evidence"]);
const gate = run(["gate"], 2);

const report = {
  fixture: "fixtures/nextjs-saas",
  temporaryTarget: target,
  auditFailedControls: audit.findings.filter((finding) => finding.status === "FAILED").map((finding) => finding.controlId),
  testVerifiedControls: verification.findings.filter((finding) => finding.status === "TEST_VERIFIED").map((finding) => finding.controlId),
  freshEvidence: evidence.filter((record) => record.fresh).length,
  gateDecision: gate.decision,
  blockingControls: gate.blocking.map((finding) => finding.controlId)
};
console.log(JSON.stringify(report, null, 2));
