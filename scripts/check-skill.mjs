import assert from "node:assert/strict";
import { cp, mkdtemp, readFile, rm } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { tmpdir } from "node:os";
import { parse as parseYaml } from "yaml";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const cli = resolve(root, "dist/apps/cli/src/main.js");
const skillRoot = resolve(root, "skills/productionos");
const checks = [];

function check(name, passed, detail) {
  checks.push({ name, passed, detail: passed ? "passed" : detail });
  if (!passed) throw new Error(`${name}: ${detail}`);
}

function runCli(target, args, expectedStatus = 0) {
  const result = spawnSync(process.execPath, [cli, ...args, "--root", target], {
    cwd: root,
    encoding: "utf8",
    maxBuffer: 8 * 1024 * 1024
  });
  assert.equal(result.status, expectedStatus, `${args.join(" ")} returned ${result.status}: ${result.stderr}`);
  if (args.includes("--json")) {
    return { ...result, value: JSON.parse(result.stdout) };
  }
  return { ...result, value: result.stdout };
}

async function copyFixture(fixture, prefix) {
  const target = await mkdtemp(join(tmpdir(), prefix));
  await cp(resolve(root, "fixtures", fixture), target, {
    recursive: true,
    filter: (source) => !source.includes(".productionos") && !source.includes("node_modules")
  });
  return target;
}

function commandAvailable(command) {
  const lookup = process.platform === "win32" ? "where.exe" : "command";
  const args = process.platform === "win32" ? [command] : ["-v", command];
  return spawnSync(lookup, args, { stdio: "ignore" }).status === 0;
}

const skill = await readFile(join(skillRoot, "SKILL.md"), "utf8");
const frontmatter = skill.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n/);
check("skill-frontmatter", Boolean(frontmatter), "SKILL.md must have a YAML frontmatter block.");
const metadata = parseYaml(frontmatter?.[1] ?? "");
check("skill-name", metadata?.name === "productionos", `name=${metadata?.name ?? "missing"}`);
check("skill-description", typeof metadata?.description === "string" && metadata.description.length > 20, "description is missing or too short.");

const references = ["workflow.md", "verification.md", "safety.md", "remediation.md"];
for (const reference of references) {
  const path = join(skillRoot, "references", reference);
  const contents = await readFile(path, "utf8");
  check(`reference:${reference}`, contents.trim().length > 0, "reference is empty.");
  check(`reference-link:${reference}`, skill.includes(`references/${reference}`), "SKILL.md does not link the progressive reference.");
}
check("skill-has-no-machine-specific-path", !/[A-Za-z]:\\\\|\/Users\/|\/home\//.test(skill), "portable skill contains a machine-specific path.");
check("skill-preserves-evidence-boundary", /never replace its evidence|never self-certify|never count as evidence/i.test(`${skill}\n${await readFile(join(skillRoot, "references", "verification.md"), "utf8")}`), "skill does not state the evidence boundary.");

const help = spawnSync(process.execPath, [cli, "help"], { cwd: root, encoding: "utf8" });
assert.equal(help.status, 0, help.stderr);
for (const command of ["status", "init", "inspect", "audit", "context", "explain", "verify", "evidence", "gate"]) {
  check(`cli-command:${command}`, new RegExp(`^  ${command}\\s`, "m").test(help.stdout), "skill workflow refers to a command missing from CLI help.");
}

const safeTarget = await copyFixture("minimal-next", "productionos-skill-safe-");
const flawedTarget = await copyFixture("nextjs-saas", "productionos-skill-flawed-");
try {
  for (const command of ["init", "inspect", "audit"]) runCli(safeTarget, [command, "--json"]);
  const context = runCli(safeTarget, ["context", "--task", "fix login", "--json"]).value;
  check("safe-context-contract", Array.isArray(context.controls), "context did not return a controls array.");
  const explanation = runCli(safeTarget, ["explain", "SEC-AUTHZ-001", "--agent", "--json"]).value;
  check("agent-explain-contract", explanation.control?.id === "SEC-AUTHZ-001" && explanation.next === "prodos verify --json", "compact agent explanation contract changed.");
  runCli(safeTarget, ["verify", "--json"]);
  const evidence = runCli(safeTarget, ["evidence", "--json"]).value;
  check("safe-evidence-contract", Array.isArray(evidence), "evidence command did not return an array.");
  const safeGate = runCli(safeTarget, ["gate", "--json"]).value;
  check("safe-gate-contract", safeGate.decision === "PASS", `safe fixture gate=${safeGate.decision ?? "missing"}`);

  for (const command of ["init", "inspect", "audit", "verify"]) runCli(flawedTarget, [command, "--json"]);
  const flawedContext = runCli(flawedTarget, ["context", "--task", "fix login", "--json"]).value;
  check("task-context-selection", flawedContext.controls?.includes("SEC-AUTHZ-001"), "context did not return the expected login control for the SaaS fixture.");
  const flawedGate = runCli(flawedTarget, ["gate", "--json"], 2).value;
  check("flawed-gate-contract", flawedGate.decision === "BLOCKED" && flawedGate.blocking?.length > 0, "flawed fixture did not produce a blocking gate.");
  check("cli-contract-fixtures", true, "safe and flawed agent workflows completed with deterministic JSON contracts.");
} finally {
  await Promise.all([rm(safeTarget, { recursive: true, force: true }), rm(flawedTarget, { recursive: true, force: true })]);
}

const agentProfiles = [
  { name: "direct shell / CI", command: null, status: "VERIFIED_BY_HARNESS", surface: "The CLI contract was exercised above." },
  { name: "Gemini CLI", command: "gemini", status: commandAvailable("gemini") ? "AVAILABLE_FOR_MANUAL_SMOKE" : "NOT_INSTALLED", surface: ".agents/skills or .gemini/skills Agent Skills layout." },
  { name: "Cursor", command: "cursor-agent", status: commandAvailable("cursor-agent") ? "AVAILABLE_FOR_MANUAL_SMOKE" : "NOT_INSTALLED", surface: ".cursor/rules or root AGENTS.md instruction surface." },
  { name: "Claude Code", command: "claude", status: commandAvailable("claude") ? "AVAILABLE_FOR_MANUAL_SMOKE" : "NOT_INSTALLED", surface: "Project instruction/import surface plus the portable skill directory." },
  { name: "Codex", command: "codex", status: commandAvailable("codex") ? "AVAILABLE_FOR_MANUAL_SMOKE" : "NOT_INSTALLED", surface: "Portable skill directory plus the local CLI." }
];

const report = {
  schemaVersion: 1,
  passed: checks.every((item) => item.passed),
  checks,
  agentProfiles,
  limitations: [
    "The harness does not invoke model-backed agent sessions or spend provider credits.",
    "AVAILABLE_FOR_MANUAL_SMOKE means a local agent CLI was found; it is not a compatibility or quality certification.",
    "Run the manual matrix in docs/AGENT-COMPATIBILITY.md for live agent validation."
  ]
};
console.log(JSON.stringify(report, null, 2));
