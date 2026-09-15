import type { DiscoveryResult, ProjectManifest } from "../../../packages/core/src/index.js";

export const SIMPLIFY_SCHEMA_VERSION = 1 as const;

export interface SimplifyFinding {
  id: string;
  status: "REVIEW";
  title: string;
  rationale: string;
  recommendation: string;
  confidence: "low" | "medium";
  evidence: string[];
}

export interface SimplifyReport {
  schemaVersion: typeof SIMPLIFY_SCHEMA_VERSION;
  generatedAt: string;
  decision: "NO_ACTION" | "REVIEW";
  findings: SimplifyFinding[];
  limitations: string[];
}

const FRAMEWORK_RUNTIME = new Set(["next", "react", "react-dom", "typescript"]);
const COMPLEX_INFRASTRUCTURE = /^(?:@kubernetes|kubernetes|helm|terraform|pulumi|redis|bull|bullmq|kafka|rabbitmq|temporal)$/i;

function packageRoot(specifier: string): string {
  if (specifier.startsWith("@")) return specifier.split("/").slice(0, 2).join("/");
  return specifier.split("/")[0] ?? specifier;
}

function observedImports(discovery: DiscoveryResult): Set<string> {
  return new Set(discovery.ast.files.flatMap((file) => file.imports.map(packageRoot)));
}

export function analyzeSimplification(manifest: ProjectManifest, discovery: DiscoveryResult): SimplifyReport {
  const imported = observedImports(discovery);
  const findings: SimplifyFinding[] = [];
  for (const dependency of discovery.dependencies) {
    if (FRAMEWORK_RUNTIME.has(dependency) || dependency.startsWith("@types/")) continue;
    if (imported.has(packageRoot(dependency))) continue;
    findings.push({
      id: `dependency:${dependency}`,
      status: "REVIEW",
      title: `Dependency not observed in TypeScript imports: ${dependency}`,
      rationale: "A declared dependency that is not visible in the bounded TypeScript import facts may be unused, configuration-only, generated-code support, or used by JavaScript/scripts outside this analysis.",
      recommendation: `Review ${dependency} in scripts, configuration, generated code, and runtime deployment before considering removal.`,
      confidence: "low",
      evidence: ["package.json", ...discovery.sourceFiles.filter((path) => path.endsWith(".ts") || path.endsWith(".tsx")).slice(0, 20)]
    });
  }

  const expectedUsers = manifest.scale?.expected_users;
  if (expectedUsers !== undefined && expectedUsers <= 1000) {
    const infrastructure = discovery.dependencies.filter((dependency) => COMPLEX_INFRASTRUCTURE.test(dependency));
    if (infrastructure.length) findings.push({
      id: "infrastructure:scale-review",
      status: "REVIEW",
      title: "Infrastructure complexity deserves a scale review",
      rationale: `The manifest declares ${expectedUsers} expected users while the dependency graph includes ${infrastructure.join(", ")}.`,
      recommendation: "Confirm each operational dependency solves a demonstrated reliability, scale, or cost problem before retaining it.",
      confidence: "low",
      evidence: ["package.json", ".productionos/manifest.yaml"]
    });
  }

  return {
    schemaVersion: SIMPLIFY_SCHEMA_VERSION,
    generatedAt: new Date().toISOString(),
    decision: findings.length ? "REVIEW" : "NO_ACTION",
    findings,
    limitations: ["This is an advisory static review, not proof that a dependency is unused or removable.", "TypeScript import facts do not cover every JavaScript file, script, configuration path, generated artifact, or deployment dependency.", "ProductionOS does not mutate the repository in simplify mode."]
  };
}

export function renderSimplify(report: SimplifyReport): string {
  const lines = ["ProductionOS simplify", "", `Decision: ${report.decision}`];
  if (report.findings.length) {
    lines.push("", "Review candidates:");
    for (const finding of report.findings) lines.push(`  ${finding.title}`, `    ${finding.recommendation}`);
  } else lines.push("", "No simplification candidate was observed within the analysis boundary.");
  lines.push("", "Limitations:", ...report.limitations.map((limitation) => `- ${limitation}`));
  return lines.join("\n");
}
