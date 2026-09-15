import { execFile } from "node:child_process";
import { access, readFile, readdir } from "node:fs/promises";
import { constants } from "node:fs";
import { promisify } from "node:util";
import { join, relative, resolve } from "node:path";

const execFileAsync = promisify(execFile);
const root = resolve(process.cwd());
const ignoredDirectories = new Set([".git", "node_modules", "dist", "coverage", ".productionos"]);
const localOnlyFiles = new Set(["AGENTS.md"]);
const findings = [];

function report(name, passed, detail) {
  findings.push({ name, passed, detail });
}

function publicPath(path) {
  return path.split("\\").join("/");
}

async function trackedFiles() {
  try {
    const { stdout } = await execFileAsync("git", ["ls-files"], { cwd: root });
    return stdout.split(/\r?\n/).filter(Boolean);
  } catch {
    return [];
  }
}

async function walk(directory) {
  const files = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    if (entry.isDirectory() && ignoredDirectories.has(entry.name)) continue;
    if (entry.isSymbolicLink()) continue;
    const absolute = join(directory, entry.name);
    if (entry.isDirectory()) files.push(...(await walk(absolute)));
    else files.push(publicPath(relative(root, absolute)));
  }
  return files;
}

const tracked = await trackedFiles();
const files = tracked.length ? tracked : (await walk(root)).filter((path) => !localOnlyFiles.has(path));
const forbiddenTracked = tracked.filter((path) => localOnlyFiles.has(path) || path.startsWith("node_modules/") || path.startsWith("dist/") || path.startsWith(".productionos/"));
report("public-file-boundary", forbiddenTracked.length === 0, forbiddenTracked.length ? `Forbidden tracked paths: ${forbiddenTracked.join(", ")}` : "No local-only or generated paths are tracked.");

const suspiciousNames = files.filter((path) => /(^|\/)(\.env(?!\.example$)|.*\.(pem|key|p12|pfx|crt))$/i.test(path));
report("credential-filenames", suspiciousNames.length === 0, suspiciousNames.length ? `Review: ${suspiciousNames.join(", ")}` : "No credential-bearing filenames are included.");

const secretPatterns = [
  /-----BEGIN(?: RSA| EC| OPENSSH)? PRIVATE KEY-----/,
  /\bAKIA[0-9A-Z]{16}\b/,
  /\bgh[pousr]_[A-Za-z0-9_]{20,}\b/,
  /\bgithub_pat_[A-Za-z0-9_]{20,}\b/,
  /(?:api[_-]?key|secret|token|password)\s*[:=]\s*["'][^"']{12,}["']/i
];
const inspected = [];
for (const path of files) {
  if (localOnlyFiles.has(path)) continue;
  const absolute = join(root, path);
  let contents;
  try {
    contents = await readFile(absolute, "utf8");
  } catch {
    continue;
  }
  if (contents.includes("\u0000")) continue;
  for (const pattern of secretPatterns) {
    if (pattern.test(contents)) inspected.push(path);
  }
}
report("secret-pattern-scan", inspected.length === 0, inspected.length ? `Review: ${[...new Set(inspected)].join(", ")}` : "No checked-in secret patterns detected.");

try {
  const packageJson = JSON.parse(await readFile(join(root, "package.json"), "utf8"));
  report("package-license", packageJson.license === "Apache-2.0", `license=${packageJson.license ?? "missing"}`);
  report("package-publishability", packageJson.private !== true, `private=${packageJson.private ?? false}`);
} catch (error) {
  report("package-manifest", false, error instanceof Error ? error.message : String(error));
}

const result = { schemaVersion: 1, passed: findings.every((finding) => finding.passed), checks: findings };
console.log(JSON.stringify(result, null, 2));
if (!result.passed) process.exitCode = 1;
