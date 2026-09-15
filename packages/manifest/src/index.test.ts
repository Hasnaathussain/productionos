import test from "node:test";
import assert from "node:assert/strict";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { discoverRepository } from "../../../packages/discovery/src/index.js";
import { defaultManifest, parseManifest, validateManifest } from "./index.js";
import { updateManifestFromDiscovery } from "./index.js";

const saasFixture = resolve(dirname(fileURLToPath(import.meta.url)), "../../../../fixtures/nextjs-saas");
const supportedAdaptersFixture = resolve(dirname(fileURLToPath(import.meta.url)), "../../../../fixtures/supported-adapters");
const supabaseAdapterFixture = resolve(dirname(fileURLToPath(import.meta.url)), "../../../../fixtures/supabase-adapter");

test("default manifest is versioned and valid", () => {
  const manifest = defaultManifest();
  assert.equal(manifest.version, 1);
  assert.equal(manifest.project.maturity, "prototype");
  assert.deepEqual(validateManifest(manifest), []);
});

test("manifest parser rejects an unknown version", () => {
  assert.throws(() => parseManifest("version: 2\nproject:\n  type: web\n  maturity: prototype\n"), /must be version 1/);
});

test("manifest validator rejects unknown fields instead of silently ignoring typos", () => {
  assert.throws(() => parseManifest("version: 1\nproject:\n  type: web\n  maturity: prototype\nreliability:\n  availabilityTarget: 99.9\n"), /unknown field/);
});

test("manifest parser preserves supported configuration", () => {
  const manifest = parseManifest("version: 1\nproject:\n  type: saas\n  maturity: saas\nai:\n  enabled: true\n  provider: openai\n");
  assert.equal(manifest.project.type, "saas");
  assert.equal(manifest.ai?.provider, "openai");
});

test("manifest validator rejects invalid scale and availability targets", () => {
  const issues = validateManifest({
    version: 1,
    project: { type: "saas", maturity: "saas" },
    scale: { expected_users: -1 },
    reliability: { availability_target: 101 }
  });
  assert.deepEqual(issues.map((issue) => issue.path), ["scale.expected_users", "reliability.availability_target"]);
});

test("manifest validator rejects malformed nested field types", () => {
  const issues = validateManifest({
    version: 1,
    project: { type: "saas", maturity: "saas" },
    runtime: { framework: 12 },
    auth: { enabled: "yes" },
    data: { pii: {} }
  });
  assert.deepEqual(issues.map((issue) => issue.path), ["runtime.framework", "auth.enabled", "data.pii"]);
});

test("inspection fills inferable providers without overwriting configured values", async () => {
  const discovery = await discoverRepository(saasFixture);
  const inferred = updateManifestFromDiscovery(defaultManifest(), discovery);
  assert.equal(inferred.runtime?.framework, "nextjs");
  assert.equal(inferred.database?.provider, "postgres");
  assert.equal(inferred.database?.orm, "prisma");
  assert.equal(inferred.payments?.provider, "stripe");
  assert.equal(inferred.ai?.provider, "openai");

  const configured = parseManifest("version: 1\nproject:\n  type: app\n  maturity: saas\nruntime:\n  framework: custom\n  deployment: custom\ndatabase:\n  provider: custom-db\npayments:\n  provider: custom-payments\nai:\n  provider: custom-ai\n");
  const preserved = updateManifestFromDiscovery(configured, discovery);
  assert.equal(preserved.runtime?.framework, "custom");
  assert.equal(preserved.runtime?.deployment, "custom");
  assert.equal(preserved.database?.provider, "custom-db");
  assert.equal(preserved.payments?.provider, "custom-payments");
  assert.equal(preserved.ai?.provider, "custom-ai");
});

test("inspection infers supported alternate providers from dependency facts", async () => {
  const discovery = await discoverRepository(supportedAdaptersFixture);
  const inferred = updateManifestFromDiscovery(defaultManifest(), discovery);
  assert.equal(inferred.runtime?.framework, "nextjs");
  assert.equal(inferred.auth?.provider, "authjs");
  assert.equal(inferred.payments?.provider, "stripe");
  assert.equal(inferred.ai?.provider, "openai");
  assert.equal(inferred.uploads?.storage, "s3");
  assert.ok(discovery.signals.auth);
  assert.ok(discovery.signals.stripe);
  assert.ok(discovery.signals.ai);
  assert.ok(discovery.signals.uploads);
});

test("inspection preserves Supabase adapter boundaries", async () => {
  const discovery = await discoverRepository(supabaseAdapterFixture);
  const inferred = updateManifestFromDiscovery(defaultManifest(), discovery);
  assert.equal(inferred.database?.provider, "supabase");
  assert.equal(inferred.auth?.provider, "supabase");
  assert.equal(inferred.uploads?.storage, "supabase");
});
