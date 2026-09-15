import { access, readFile } from "node:fs/promises";
import { constants } from "node:fs";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";

const root = resolve(process.cwd());
const checks = [];
const advisories = [];

function check(name, passed, detail) {
  checks.push({ name, passed, detail });
}

async function exists(path) {
  try {
    await access(path, constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

const requiredFiles = [
  "docs/MASTER_SPEC.md",
  "docs/PRODUCT.md",
  "docs/MVP.md",
  "docs/ARCHITECTURE.md",
  "docs/CONTROL_MODEL.md",
  "docs/DEVELOPMENT_STATE.md",
  "docs/ROADMAP.md",
  "policies/control.schema.json",
  "README.md",
  "LICENSE",
  ".github/workflows/ci.yml",
  ".github/workflows/release.yml",
  "dist/apps/cli/src/main.js"
];
const present = await Promise.all(requiredFiles.map((path) => exists(join(root, path))));
const missing = requiredFiles.filter((_path, index) => !present[index]);
check("required-release-artifacts", missing.length === 0, missing.length ? `Missing: ${missing.join(", ")}` : `${requiredFiles.length} required files are present.`);

const adrEntries = await (await import("node:fs/promises")).readdir(join(root, "docs/decisions"), { withFileTypes: true }).catch(() => []);
const adrCount = adrEntries.filter((entry) => entry.isFile() && entry.name.endsWith(".md")).length;
check("architecture-decision-records", adrCount >= 5, `${adrCount} ADR files found.`);

try {
  const packageJson = JSON.parse(await readFile(join(root, "package.json"), "utf8"));
  check("package-version", packageJson.version === "0.1.0", `version=${packageJson.version ?? "missing"}`);
  check("package-cli-bin", packageJson.bin?.prodos === "dist/apps/cli/src/main.js", `bin=${packageJson.bin?.prodos ?? "missing"}`);
  const publicationMetadata = packageJson.private !== true && packageJson.license === "Apache-2.0" && Boolean(packageJson.repository?.url);
  check("package-publication-metadata", publicationMetadata, `private=${packageJson.private ?? false}, license=${packageJson.license ?? "missing"}`);
} catch (error) {
  check("package-manifest", false, error instanceof Error ? error.message : String(error));
}

try {
  const policy = await import(pathToFileURL(join(root, "dist/packages/policy/src/index.js")).href);
  const core = await import(pathToFileURL(join(root, "dist/packages/core/src/index.js")).href);
  const count = policy.CONTROL_DEFINITIONS.length;
  check("control-catalog-size", count >= 25 && count <= 40, `${count} controls are registered.`);
  const incomplete = policy.CONTROL_DEFINITIONS.filter((definition) => !definition.failureModes?.length || !definition.tradeoffs?.length || !definition.evidence?.length || !definition.limitations?.length || !definition.falsePositiveBoundary);
  check("control-contract-metadata", incomplete.length === 0, incomplete.length ? `Missing required metadata: ${incomplete.map((definition) => definition.id).join(", ")}` : "All controls carry explanation and evidence metadata.");
  check("policy-version", policy.policyVersion() === "1.2.0", `policy=${policy.policyVersion()}`);
  check("requirement-graph-version", core.REQUIREMENT_GRAPH_SCHEMA_VERSION === 3, `schema=${core.REQUIREMENT_GRAPH_SCHEMA_VERSION}`);
} catch (error) {
  check("compiled-policy-surface", false, error instanceof Error ? error.message : String(error));
}

try {
  const benchmark = JSON.parse(await readFile(join(root, "benchmarks/results.json"), "utf8"));
  const totals = benchmark.totals ?? {};
  const healthy = totals.missed === 0 && totals.falsePositive === 0 && totals.remediationMissed === 0 && totals.verificationMissed === 0 && totals.regressionMissed === 0;
  check("benchmark-health", healthy, `cases=${benchmark.cases?.length ?? 0}, detected=${totals.detected ?? 0}/${totals.expected ?? 0}`);
} catch (error) {
  check("benchmark-results", false, error instanceof Error ? error.message : String(error));
}

advisories.push({ name: "remote-workflow", status: "REMOTE_VERIFICATION_REQUIRED", detail: "The checked-in GitHub CI workflow must complete on the hosting platform after publication." });

const report = {
  schemaVersion: 1,
  passed: checks.every((item) => item.passed),
  checks,
  advisories
};
console.log(JSON.stringify(report, null, 2));
if (!report.passed) process.exitCode = 1;
