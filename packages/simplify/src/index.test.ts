import test from "node:test";
import assert from "node:assert/strict";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { discoverRepository } from "../../../packages/discovery/src/index.js";
import { defaultManifest } from "../../../packages/manifest/src/index.js";
import { analyzeSimplification } from "./index.js";

const fixture = resolve(dirname(fileURLToPath(import.meta.url)), "../../../../fixtures/nextjs-saas");
const minimalFixture = resolve(dirname(fileURLToPath(import.meta.url)), "../../../../fixtures/minimal-next");

test("simplify reports review candidates without claiming removal is safe", async () => {
  const report = analyzeSimplification(defaultManifest(), await discoverRepository(fixture));
  assert.equal(report.decision, "REVIEW");
  assert.ok(report.findings.some((finding) => finding.id === "dependency:@prisma/client"));
  assert.ok(report.limitations.some((limitation) => limitation.includes("not proof")));
});

test("simplify can recommend no action for a minimal app", async () => {
  const report = analyzeSimplification(defaultManifest(), await discoverRepository(minimalFixture));
  assert.equal(report.decision, "NO_ACTION");
  assert.deepEqual(report.findings, []);
});
