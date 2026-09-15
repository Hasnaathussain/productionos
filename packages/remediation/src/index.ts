import { access, mkdir, writeFile } from "node:fs/promises";
import { constants } from "node:fs";
import { join } from "node:path";
import { ProductionOSError, REMEDIATION_SCHEMA_VERSION, productionOSPaths, type EvaluationContext, type RemediationPlan } from "../../../packages/core/src/index.js";

const HEADER_MIDDLEWARE = `import { NextResponse } from "next/server";

export function middleware(request: Request) {
  const response = NextResponse.next();
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"]
};
`;

export function createRemediationPlan(context: EvaluationContext, controlId: string): RemediationPlan {
  const normalized = controlId.toUpperCase();
  const generatedAt = new Date().toISOString();
  if (normalized !== "SEC-HEADERS-001") {
    return {
      schemaVersion: REMEDIATION_SCHEMA_VERSION,
      controlId: normalized,
      status: "PLANNED",
      risk: "medium",
      preconditions: ["The control must be reviewed by an agent or engineer with repository context."],
      changes: ["No automatic change is implemented for this control yet."],
      verification: ["Run prodos audit and prodos verify after an intentional implementation."],
      rollback: ["Revert the reviewed change using the repository's normal version-control workflow."],
      files: [],
      generatedAt
    };
  }
  if (context.discovery.framework !== "nextjs") return { schemaVersion: REMEDIATION_SCHEMA_VERSION, controlId: normalized, status: "BLOCKED", risk: "low", preconditions: ["A Next.js application must be detected."], changes: [], verification: [], rollback: [], files: [], generatedAt };
  const existing = context.snapshot.files.find((file) => file.path === "middleware.ts" || file.path === "src/middleware.ts");
  if (existing) return { schemaVersion: REMEDIATION_SCHEMA_VERSION, controlId: normalized, status: "BLOCKED", risk: "low", preconditions: ["No existing middleware file may be present; merge headers into the existing boundary manually."], changes: [], verification: ["Review the existing middleware, then run prodos verify."], rollback: ["Revert the reviewed middleware change."], files: [existing.path], generatedAt };
  return {
    schemaVersion: REMEDIATION_SCHEMA_VERSION,
    controlId: normalized,
    status: "READY",
    risk: "low",
    preconditions: ["Next.js was detected.", "No middleware.ts or src/middleware.ts exists.", "The generated headers are reviewed before deployment."],
    changes: ["Create middleware.ts with nosniff, frame, and referrer headers for application routes."],
    verification: ["Run the target typecheck/build if configured.", "Run prodos inspect, prodos audit, prodos verify, and prodos gate.", "Review CSP and deployment-specific headers before production."],
    rollback: ["Delete the generated middleware.ts or revert the single-file change."],
    files: ["middleware.ts"],
    generatedAt
  };
}

export async function applyRemediation(root: string, plan: RemediationPlan): Promise<RemediationPlan> {
  if (plan.status !== "READY" || plan.controlId !== "SEC-HEADERS-001") throw new ProductionOSError("REMEDIATION_BLOCKED", `Remediation ${plan.controlId} is not ready for automatic application.`);
  const target = join(root, "middleware.ts");
  try { await access(target, constants.F_OK); throw new ProductionOSError("REMEDIATION_PRECONDITION", "middleware.ts appeared after planning; refusing to overwrite it."); } catch (error) { if (error instanceof ProductionOSError) throw error; }
  await writeFile(target, HEADER_MIDDLEWARE, "utf8");
  const applied = { ...plan, status: "APPLIED" as const, appliedAt: new Date().toISOString() };
  const paths = productionOSPaths(root);
  await mkdir(paths.remediations, { recursive: true });
  const filename = `${plan.controlId.toLowerCase()}-${applied.appliedAt.replace(/[:.]/g, "-")}.json`;
  await writeFile(join(paths.remediations, filename), `${JSON.stringify(applied, null, 2)}\n`, "utf8");
  return applied;
}

export const generatedHeaderMiddleware = HEADER_MIDDLEWARE;
