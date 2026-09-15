import test from "node:test";
import assert from "node:assert/strict";
import { cp, mkdtemp } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { tmpdir } from "node:os";
import { loadRepositorySnapshot } from "../../../packages/core/src/index.js";
import { discoverRepository } from "../../../packages/discovery/src/index.js";
import { buildCapabilityGraph } from "../../../packages/graph/src/index.js";
import { defaultManifest } from "../../../packages/manifest/src/index.js";
import { applyRemediation, createRemediationPlan } from "./index.js";

const fixture = resolve(dirname(fileURLToPath(import.meta.url)), "../../../../fixtures/minimal-next");

test("header remediation is plan-first and preconditioned", async () => {
  const root = await mkdtemp(resolve(tmpdir(), "productionos-remediation-"));
  await cp(fixture, root, { recursive: true });
  const discovery = await discoverRepository(root);
  const context = { root, manifest: defaultManifest(), discovery, capabilities: buildCapabilityGraph(discovery), snapshot: await loadRepositorySnapshot(root) };
  const plan = createRemediationPlan(context, "SEC-HEADERS-001");
  assert.equal(plan.status, "READY");
  const applied = await applyRemediation(root, plan);
  assert.equal(applied.status, "APPLIED");
  const after = await loadRepositorySnapshot(root);
  assert.ok(after.files.some((file) => file.path === "middleware.ts"));
  const blocked = createRemediationPlan({ ...context, snapshot: after }, "SEC-HEADERS-001");
  assert.equal(blocked.status, "BLOCKED");
});

test("unsupported automatic fixes remain explicit plans", async () => {
  const root = await mkdtemp(resolve(tmpdir(), "productionos-remediation-plan-"));
  await cp(fixture, root, { recursive: true });
  const discovery = await discoverRepository(root);
  const context = { root, manifest: defaultManifest(), discovery, capabilities: buildCapabilityGraph(discovery), snapshot: await loadRepositorySnapshot(root) };
  const plan = createRemediationPlan(context, "SEC-RATE-001");
  assert.equal(plan.status, "PLANNED");
  assert.equal(plan.files.length, 0);
});
