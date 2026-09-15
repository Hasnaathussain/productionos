import test from "node:test";
import assert from "node:assert/strict";
import { spawn, spawnSync } from "node:child_process";
import { cp, mkdtemp, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { tmpdir } from "node:os";
import { createServer } from "node:http";

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../../../..");
const cli = resolve(repositoryRoot, "dist/apps/cli/src/main.js");
const fixture = resolve(repositoryRoot, "fixtures/nextjs-saas");
const minimalFixture = resolve(repositoryRoot, "fixtures/minimal-next");

function runCliAsync(args: string[]): Promise<{ status: number | null; stdout: string; stderr: string }> {
  return new Promise((resolvePromise, reject) => {
    const child = spawn(process.execPath, [cli, ...args], { cwd: repositoryRoot });
    let stdout = "";
    let stderr = "";
    if (!child.stdout || !child.stderr) { reject(new Error("CLI child process did not expose output streams.")); return; }
    child.stdout.on("data", (chunk: Buffer) => { stdout += chunk.toString(); });
    child.stderr.on("data", (chunk: Buffer) => { stderr += chunk.toString(); });
    child.on("error", reject);
    child.on("close", (status) => resolvePromise({ status, stdout, stderr }));
  });
}

test("CLI exposes a runnable help surface", () => {
  const result = spawnSync(process.execPath, [cli, "help"], { cwd: repositoryRoot, encoding: "utf8" });
  assert.equal(result.status, 0, result.stderr);
  assert.doesNotMatch(result.stdout, /\\n/);
  assert.ok(result.stdout.split(/\r?\n/).length > 20);
  assert.match(result.stdout, /inspect\s+Detect stack/);
  assert.match(result.stdout, /gate\s+Apply profile policy/);
  assert.match(result.stdout, /load\s+Measure an explicitly authorized loopback endpoint/);
});

test("CLI rejects unknown options with an actionable error", () => {
  const result = spawnSync(process.execPath, [cli, "status", "--not-a-real-option"], { cwd: repositoryRoot, encoding: "utf8" });
  assert.equal(result.status, 1);
  assert.match(result.stderr, /Unknown option '--not-a-real-option'/);
  assert.match(result.stderr, /prodos help/);
});

test("CLI initializes, inspects, and emits compact JSON status", async () => {
  const root = await mkdtemp(resolve(tmpdir(), "productionos-cli-"));
  await cp(fixture, root, { recursive: true, filter: (source) => !source.includes(".productionos") && !source.includes("node_modules") });
  const init = spawnSync(process.execPath, [cli, "init", "--root", root], { cwd: repositoryRoot, encoding: "utf8" });
  assert.equal(init.status, 0, init.stderr);
  const inspect = spawnSync(process.execPath, [cli, "inspect", "--root", root], { cwd: repositoryRoot, encoding: "utf8" });
  assert.equal(inspect.status, 0, inspect.stderr);
  const result = spawnSync(process.execPath, [cli, "status", "--root", root, "--json"], { cwd: repositoryRoot, encoding: "utf8" });
  assert.equal(result.status, 0, result.stderr);
  const parsed = JSON.parse(result.stdout) as { schemaVersion: number; currentMilestone: string };
  assert.equal(parsed.schemaVersion, 1);
  assert.equal(typeof parsed.currentMilestone, "string");
  const simplify = spawnSync(process.execPath, [cli, "simplify", "--root", root, "--json"], { cwd: repositoryRoot, encoding: "utf8" });
  assert.equal(simplify.status, 0, simplify.stderr);
  assert.equal((JSON.parse(simplify.stdout) as { decision: string }).decision, "REVIEW");
  const slo = spawnSync(process.execPath, [cli, "slo", "--root", root, "--json"], { cwd: repositoryRoot, encoding: "utf8" });
  assert.equal(slo.status, 0, slo.stderr);
  assert.ok(Array.isArray((JSON.parse(slo.stdout) as { objectives: unknown[] }).objectives));
  const explain = spawnSync(process.execPath, [cli, "explain", "SEC-AUTHZ-001", "--root", root, "--agent", "--json"], { cwd: repositoryRoot, encoding: "utf8" });
  assert.equal(explain.status, 0, explain.stderr);
  const agentContext = JSON.parse(explain.stdout) as { control: { id: string; files: string[]; evidence: unknown[]; limitations: string[]; falsePositiveBoundary: string; failureModes: string[]; tradeoffs: string[] }; constraints: string[]; next: string };
  assert.equal(agentContext.control.id, "SEC-AUTHZ-001");
  assert.ok(Array.isArray(agentContext.control.files));
  assert.ok(Array.isArray(agentContext.control.evidence));
  assert.ok(Array.isArray(agentContext.control.limitations));
  assert.ok(agentContext.control.falsePositiveBoundary.length > 0);
  assert.ok(agentContext.control.failureModes.length > 0);
  assert.ok(agentContext.control.tradeoffs.length > 0);
  assert.ok(agentContext.constraints.length > 0);
  assert.equal(agentContext.next, "prodos verify --json");
  const humanExplain = spawnSync(process.execPath, [cli, "explain", "SEC-AUTHZ-001", "--root", root], { cwd: repositoryRoot, encoding: "utf8" });
  assert.equal(humanExplain.status, 0, humanExplain.stderr);
  assert.match(humanExplain.stdout, /How it can fail:/);
  assert.match(humanExplain.stdout, /Tradeoffs:/);
  const context = spawnSync(process.execPath, [cli, "context", "--root", root, "--task", "fix checkout", "--json"], { cwd: repositoryRoot, encoding: "utf8" });
  assert.equal(context.status, 0, context.stderr);
  const checkoutContext = JSON.parse(context.stdout) as { controls: string[] };
  assert.ok(checkoutContext.controls.includes("PAY-VALIDATE-001"));
  assert.ok(checkoutContext.controls.includes("SEC-WEBHOOK-002"));
});

test("CLI can produce a passing prototype gate for a minimal app", async () => {
  const root = await mkdtemp(resolve(tmpdir(), "productionos-gate-"));
  await cp(minimalFixture, root, { recursive: true });
  for (const command of ["init", "inspect", "audit", "verify"]) {
    const result = spawnSync(process.execPath, [cli, command, "--root", root], { cwd: repositoryRoot, encoding: "utf8" });
    assert.equal(result.status, 0, `${command}: ${result.stderr}`);
  }
  const gate = spawnSync(process.execPath, [cli, "gate", "--root", root, "--json"], { cwd: repositoryRoot, encoding: "utf8" });
  assert.equal(gate.status, 0, gate.stderr);
  assert.equal((JSON.parse(gate.stdout) as { decision: string }).decision, "PASS");
  const launch = spawnSync(process.execPath, [cli, "launch", "--root", root], { cwd: repositoryRoot, encoding: "utf8" });
  assert.equal(launch.status, 0, launch.stderr);
  assert.match(launch.stdout, /Can I launch\?[\s\S]*YES/);
});

test("CLI rejects malformed waiver records", async () => {
  const root = await mkdtemp(resolve(tmpdir(), "productionos-waiver-"));
  await cp(minimalFixture, root, { recursive: true });
  for (const command of ["init", "inspect", "audit", "verify"]) {
    const result = spawnSync(process.execPath, [cli, command, "--root", root], { cwd: repositoryRoot, encoding: "utf8" });
    assert.equal(result.status, 0, `${command}: ${result.stderr}`);
  }
  await writeFile(join(root, ".productionos", "waivers", "invalid.yaml"), "control: SEC-AUTHZ-001\nreason:\nowner: owner\n", "utf8");
  const gate = spawnSync(process.execPath, [cli, "gate", "--root", root], { cwd: repositoryRoot, encoding: "utf8" });
  assert.equal(gate.status, 1);
  assert.match(gate.stderr, /WAIVER_INVALID/);
  await writeFile(join(root, ".productionos", "waivers", "invalid.yaml"), "control: DOES-NOT-EXIST\nreason: reason\nowner: owner\n", "utf8");
  const unknown = spawnSync(process.execPath, [cli, "gate", "--root", root], { cwd: repositoryRoot, encoding: "utf8" });
  assert.equal(unknown.status, 1);
  assert.match(unknown.stderr, /unknown control/);
});

test("CLI measures an explicitly authorized loopback endpoint", async () => {
  const root = await mkdtemp(resolve(tmpdir(), "productionos-load-"));
  await cp(minimalFixture, root, { recursive: true });
  const init = spawnSync(process.execPath, [cli, "init", "--root", root], { cwd: repositoryRoot, encoding: "utf8" });
  assert.equal(init.status, 0, init.stderr);
  const server = createServer((_request, response) => {
    response.statusCode = 200;
    response.end("ok");
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  try {
    const address = server.address();
    assert.ok(address && typeof address !== "string");
    const load = await runCliAsync(["load", "--root", root, "--url", `http://127.0.0.1:${address.port}/health`, "--allow-local", "--requests", "4", "--concurrency", "2", "--json"]);
    assert.equal(load.status, 0, load.stderr);
    const report = JSON.parse(load.stdout) as { successes: number; failures: number; classification: string };
    assert.equal(report.successes, 4);
    assert.equal(report.failures, 0);
    assert.equal(report.classification, "measured");
  } finally {
    await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  }
});
