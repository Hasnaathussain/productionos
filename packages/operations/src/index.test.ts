import test from "node:test";
import assert from "node:assert/strict";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { discoverRepository } from "../../../packages/discovery/src/index.js";
import { buildCapabilityGraph } from "../../../packages/graph/src/index.js";
import { defaultManifest } from "../../../packages/manifest/src/index.js";
import { buildSloReport } from "./index.js";

const fixture = resolve(dirname(fileURLToPath(import.meta.url)), "../../../../fixtures/nextjs-saas");

test("SLO report preserves configured availability while keeping proof unverified", async () => {
  const discovery = await discoverRepository(fixture);
  const manifest = { ...defaultManifest(), project: { type: "saas", maturity: "saas" as const }, reliability: { availability_target: 99.9 } };
  const report = buildSloReport(manifest, buildCapabilityGraph(discovery));
  const availability = report.objectives.find((item) => item.id === "api-availability");
  assert.equal(availability?.target, 99.9);
  assert.equal(availability?.status, "CONFIGURED_UNVERIFIED");
  assert.equal(availability?.verification, "runtime");
  assert.ok(report.objectives.some((item) => item.id === "checkout-success"));
  assert.equal(report.objectives.find((item) => item.id === "api-latency-p95")?.status, "UNSPECIFIED");
});

test("prototype without an API does not receive invented objectives", async () => {
  const manifest = defaultManifest();
  const report = buildSloReport(manifest, { schemaVersion: 1, generatedAt: new Date().toISOString(), nodes: [], edges: [] });
  assert.deepEqual(report.objectives, []);
});
