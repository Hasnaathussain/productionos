import type { CapabilityGraph, MaturityProfile, ProjectManifest } from "../../../packages/core/src/index.js";

export const SLO_SCHEMA_VERSION = 1 as const;

export interface SloObjective {
  id: string;
  title: string;
  target: number | null;
  unit: "percent" | "success_rate" | "milliseconds";
  status: "CONFIGURED_UNVERIFIED" | "UNSPECIFIED";
  source: "manifest" | "not_configured";
  rationale: string;
  verification: "runtime";
}

export interface SloReport {
  schemaVersion: typeof SLO_SCHEMA_VERSION;
  generatedAt: string;
  profile: MaturityProfile;
  objectives: SloObjective[];
  limitations: string[];
}

function objective(id: string, title: string, target: number | null, unit: SloObjective["unit"], rationale: string): SloObjective {
  return {
    id,
    title,
    target,
    unit,
    status: target === null ? "UNSPECIFIED" : "CONFIGURED_UNVERIFIED",
    source: target === null ? "not_configured" : "manifest",
    rationale,
    verification: "runtime"
  };
}

export function buildSloReport(manifest: ProjectManifest, capabilities: CapabilityGraph): SloReport {
  const ids = new Set(capabilities.nodes.map((node) => node.id));
  const objectives: SloObjective[] = [];
  if (ids.has("public_api") || manifest.project.maturity !== "prototype") objectives.push(objective("api-availability", "API availability", manifest.reliability?.availability_target ?? null, "percent", "A service objective must be measured against an agreed availability window; source configuration is not runtime proof."));
  if (ids.has("public_api")) objectives.push(objective("api-latency-p95", "API p95 latency", null, "milliseconds", "Latency objectives require an endpoint scope and an authorized measurement window; ProductionOS does not invent a target."));
  if (ids.has("user_authentication")) objectives.push(objective("authentication-success", "Authentication success", null, "success_rate", "Login success should be measured from authorized application telemetry, not inferred from an auth dependency."));
  if (ids.has("payments")) objectives.push(objective("checkout-success", "Checkout success", null, "success_rate", "Payment success and failure rates require provider-aware runtime measurements and reconciliation context."));
  if (ids.has("background_jobs")) objectives.push(objective("background-job-success", "Background job success", null, "success_rate", "Worker success and retry behavior require runtime job telemetry."));
  return {
    schemaVersion: SLO_SCHEMA_VERSION,
    generatedAt: new Date().toISOString(),
    profile: manifest.project.maturity,
    objectives,
    limitations: ["Objectives are planning/configuration records, not measured SLO evidence.", "ProductionOS does not invent targets for authentication, payments, jobs, or latency.", "Runtime verification requires an explicitly authorized telemetry or test adapter."]
  };
}

export function renderSlo(report: SloReport): string {
  const lines = ["ProductionOS SLO objectives", "", `Profile: ${report.profile}`];
  if (!report.objectives.length) lines.push("", "No capability-triggered objectives were generated.");
  else for (const item of report.objectives) lines.push("", `${item.title}: ${item.target === null ? "UNSPECIFIED" : `${item.target}${item.unit === "percent" ? "%" : item.unit === "milliseconds" ? "ms" : ""}`} (${item.status})`, `  ${item.rationale}`);
  lines.push("", "Limitations:", ...report.limitations.map((limitation) => `- ${limitation}`));
  return lines.join("\n");
}
