import test from "node:test";
import assert from "node:assert/strict";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { loadRepositorySnapshot } from "../../../packages/core/src/index.js";
import { discoverRepository } from "../../../packages/discovery/src/index.js";
import { buildCapabilityGraph } from "../../../packages/graph/src/index.js";
import { defaultManifest } from "../../../packages/manifest/src/index.js";
import { evaluateControls } from "../../../packages/policy/src/index.js";
import { controlTestEvidence, testCommandForPackageManager } from "./index.js";

const fixture = resolve(dirname(fileURLToPath(import.meta.url)), "../../../../fixtures/nextjs-saas");

test("control-specific test filenames create test evidence only for that control", async () => {
  const discovery = await discoverRepository(fixture);
  const capabilities = buildCapabilityGraph(discovery);
  const context = { root: fixture, manifest: defaultManifest(), discovery, capabilities, snapshot: await loadRepositorySnapshot(fixture) };
  const records = controlTestEvidence(context, evaluateControls(context), { command: ["npm", "test"], exitCode: 0, output: "pass", startedAt: "2026-01-01T00:00:00.000Z", completedAt: "2026-01-01T00:00:01.000Z" });
  assert.deepEqual(records.map((record) => record.controlId), ["SEC-SECRET-001"]);
  assert.equal(records[0]?.status, "TEST_VERIFIED");
});

test("test verification uses only recognized package-manager commands", () => {
  assert.deepEqual(testCommandForPackageManager("npm", "linux"), ["npm", "test"]);
  assert.deepEqual(testCommandForPackageManager("pnpm", "linux"), ["pnpm", "test"]);
  assert.deepEqual(testCommandForPackageManager("yarn", "linux"), ["yarn", "test"]);
  assert.deepEqual(testCommandForPackageManager("bun", "linux"), ["bun", "test"]);
  assert.deepEqual(testCommandForPackageManager("unknown", "linux"), ["npm", "test"]);
  assert.deepEqual(testCommandForPackageManager("pnpm", "win32").slice(1), ["/d", "/s", "/c", "pnpm.cmd test"]);
});
