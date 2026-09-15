import { REQUIREMENT_GRAPH_SCHEMA_VERSION, type CapabilityGraph, type CheckResult, type ControlDefinition, type ControlFinding, type EvaluationContext, type EvidenceArtifact, type EvidenceRequirement, type RequirementDefinition, type RequirementGraph, type Severity, type VerificationMethod } from "../../../packages/core/src/index.js";

const VERSION = "1.2.0";

interface ControlExplanation {
  failureModes?: string[];
  tradeoffs?: string[];
}

function lowerFirst(value: string): string {
  return value.length ? `${value[0]?.toLowerCase() ?? ""}${value.slice(1)}` : value;
}

function evidenceRequirements(verification: VerificationMethod[]): EvidenceRequirement[] {
  return verification.map((method) => {
    const artifact: EvidenceArtifact = method === "static" ? "source_reference" : method === "test" ? "test_result" : "runtime_observation";
    const description = method === "static"
      ? "The deterministic static evaluator must return a passing result."
      : method === "test"
        ? "A passing control-specific test result must be captured; project-wide test success is not sufficient."
        : "An explicitly authorized runtime observation must be captured with its command and limitations.";
    return { method, artifact, description };
  });
}

function signal(context: EvaluationContext, name: string, missing: string): CheckResult {
  const evidence = context.discovery.signals[name];
  if (evidence) return { outcome: "pass", summary: `Detected ${name.replaceAll("_", " ")}.`, details: [`Observed ${evidence.matches} matching signal${evidence.matches === 1 ? "" : "s"}.`], files: evidence.files };
  return { outcome: "fail", summary: missing, details: ["No deterministic source evidence matched the control pattern."], files: [] };
}

function anySignal(context: EvaluationContext, names: string[], missing: string): CheckResult {
  const matches = names.flatMap((name) => context.discovery.signals[name]?.files ?? []);
  if (matches.length) return { outcome: "pass", summary: `Detected ${names.filter((name) => context.discovery.signals[name]).join(", ").replaceAll("_", " ")}.`, details: ["At least one accepted implementation signal is present."], files: [...new Set(matches)].sort() };
  return { outcome: "fail", summary: missing, details: ["No deterministic source evidence matched the accepted implementation signals."], files: [] };
}

function noHardcodedSecrets(context: EvaluationContext): CheckResult {
  const matches: string[] = [];
  for (const file of context.snapshot.files) {
    if (file.path.startsWith(".env") || file.path.includes("/fixtures/") || file.path.includes("/examples/")) continue;
    if (/\b(?:API_KEY|SECRET|TOKEN|PASSWORD|PRIVATE_KEY)\s*[:=]\s*["'][^"']{8,}["']/i.test(file.content)) matches.push(file.path);
  }
  return matches.length
    ? { outcome: "fail", summary: "Potential hard-coded secret detected.", details: ["Move credentials to an environment or secret manager and rotate exposed values."], files: [...new Set(matches)].sort() }
    : { outcome: "pass", summary: "No obvious hard-coded secret pattern detected.", details: ["This static check does not prove that secrets are safe in history or runtime logs."], files: context.snapshot.files.filter((file) => /\.(?:ts|tsx|js|jsx|json|yaml|yml)$/.test(file.path)).map((file) => file.path).slice(0, 50) };
}

function lockfile(context: EvaluationContext): CheckResult {
  if (context.discovery.toolchain.hasLockfile) return { outcome: "pass", summary: `Detected ${context.discovery.packageManager} lockfile.`, details: ["Dependency resolution has a repository-pinned input."], files: ["package-lock.json", "pnpm-lock.yaml", "yarn.lock", "bun.lockb"].filter((path) => context.discovery.configFiles.includes(path)) };
  return { outcome: "fail", summary: "No package-manager lockfile detected.", details: ["Commit the lockfile used by CI and local installs."], files: [] };
}

function backupReadiness(context: EvaluationContext): CheckResult {
  const configured = context.discovery.signals.backup_configured;
  const documented = context.discovery.signals.restore_documented;
  const tested = context.discovery.signals.restore_tested;
  const freshness = context.discovery.signals.backup_freshness;
  const objective = context.discovery.signals.recovery_objective;
  const files = [...new Set([...(configured?.files ?? []), ...(documented?.files ?? []), ...(tested?.files ?? []), ...(freshness?.files ?? []), ...(objective?.files ?? [])])].sort();
  if (tested) return { outcome: "unknown", summary: "A restore-test procedure is described, but execution evidence is unavailable.", details: ["Run an authorized restore drill and preserve its result before treating recovery as verified."], files };
  if (configured || documented) return { outcome: "unknown", summary: `Backup configured: ${configured ? "yes" : "unknown"}; restore documented: ${documented ? "yes" : "no"}; freshness: ${freshness ? "observed" : "unknown"}; recovery objective: ${objective ? "observed" : "unknown"}; restore test: unknown.`, details: ["Configured backups, freshness descriptions, recovery objectives, and written procedures do not prove that recovery works."], files };
  return { outcome: "unknown", summary: "No backup or restore procedure signal was detected.", details: ["Backup readiness is unassessed until configuration, restore documentation, and restore-test evidence are available."], files: [] };
}

function control(
  id: string,
  title: string,
  domain: string,
  severity: Severity,
  triggerCapabilities: string[],
  rationale: string,
  recommendation: string,
  verification: VerificationMethod[],
  affectedFiles: string[],
  check: (context: EvaluationContext) => CheckResult,
  explanation: ControlExplanation = {}
): ControlDefinition {
  return {
    id,
    title,
    domain,
    severity,
    triggerCapabilities,
    rationale,
    recommendation,
    failureModes: explanation.failureModes ?? [`If ${title.toLowerCase()} is absent, bypassed, or applied at the wrong boundary, ${lowerFirst(rationale)}`],
    tradeoffs: explanation.tradeoffs ?? ["The recommended boundary can add implementation or runtime overhead; keep it proportional to the active capability and verify it independently."],
    verification,
    evidence: evidenceRequirements(verification),
    limitations: [
      "A source signal or passing static check does not prove all runtime behavior.",
      "Evidence is bounded by the inspected files, executed command, and recorded limitations."
    ],
    falsePositiveBoundary: "A matching implementation signal is an indicator, not a self-certifying proof; the control's independent verification contract still applies.",
    affectedFiles,
    check
  };
}

export const CONTROL_DEFINITIONS: readonly ControlDefinition[] = [
  control("SEC-AUTH-001", "Authentication boundary", "security", "critical", ["user_authentication"], "Authentication establishes who is making a request, but the boundary must be visible to protected handlers.", "Use a documented server-side authentication boundary and test unauthenticated access to protected routes.", ["static", "test"], ["app", "pages", "middleware.ts"], (context) => signal(context, "auth", "Authentication dependency or server-side identity boundary not detected.")),
  control("SEC-AUTHZ-001", "Authorization on protected operations", "authorization", "critical", ["authorization", "user_authentication", "admin_panel"], "An authenticated identity does not prove that the identity may perform the requested operation.", "Enforce resource and role authorization at the server boundary before reads and mutations.", ["static", "test"], ["app", "pages", "middleware.ts"], (context) => signal(context, "authorization", "No authorization boundary was detected for the active application capabilities.")),
  control("SEC-TENANT-001", "Tenant isolation", "authorization", "critical", ["multi_tenancy"], "A missing tenant predicate can expose one customer's data to another customer.", "Derive tenant scope from the authenticated identity and enforce it in every relevant query and mutation.", ["static", "test"], ["app", "pages", "prisma", "src"], (context) => signal(context, "multi_tenancy", "Multi-tenant capability was detected, but no tenant-scoping signal was found.")),
  control("SEC-SECRET-001", "Source secret handling", "security", "critical", [], "Credentials committed to source can be copied from repository history and used outside the application.", "Keep secrets out of source and provide an example configuration containing names only.", ["static", "test"], ["src", "app", "pages", "package.json"], noHardcodedSecrets),
  control("SEC-HEADERS-001", "Security headers", "security", "high", ["public_api", "user_authentication"], "Browser-facing headers reduce common cross-origin, framing, and content-sniffing attack surface.", "Set a deliberate baseline for CSP, HSTS, frame, content-type, and referrer behavior at the deployment boundary.", ["static", "test"], ["middleware.ts", "next.config.js", "next.config.mjs", "app"], (context) => signal(context, "security_headers", "No security-header configuration was detected.")),
  control("SEC-CSRF-001", "Mutation request protection", "security", "high", ["public_api", "payments"], "Cookie-authenticated mutations can be forged by another origin without origin or CSRF defenses.", "Use same-site cookies plus an explicit CSRF/origin strategy for browser mutations.", ["static", "test"], ["app", "pages", "middleware.ts"], (context) => signal(context, "csrf", "No CSRF or origin-validation signal was detected for mutation-capable endpoints.")),
  control("SEC-CORS-001", "Explicit CORS policy", "security", "medium", ["public_api"], "An accidental wildcard origin can expose authenticated responses to untrusted applications.", "Define an explicit allowlist and credentials policy rather than inheriting permissive defaults.", ["static", "test"], ["middleware.ts", "app", "pages"], (context) => signal(context, "cors", "No explicit CORS policy was detected.")),
  control("SEC-INPUT-001", "Input validation", "security", "high", ["public_api", "payments", "file_uploads"], "Unvalidated input reaches parsers, queries, providers, and business rules with attacker-controlled shape.", "Validate request bodies, query parameters, headers, and provider payloads at their trust boundary.", ["static", "test"], ["app", "pages", "src"], (context) => signal(context, "input_validation", "No input-validation library or boundary pattern was detected.")),
  control("SEC-UPLOAD-001", "Upload size and content validation", "security", "high", ["file_uploads"], "Unbounded or type-confused uploads can exhaust resources or turn downstream parsers into an attack surface.", "Enforce size, MIME/content, extension, and processing limits before storage or parsing.", ["static", "test"], ["app", "pages", "src"], (context) => signal(context, "upload_limits", "File upload capability was detected without size or content validation signals.")),
  control("SEC-UPLOAD-002", "Upload authorization and storage boundary", "security", "critical", ["file_uploads"], "An upload endpoint must not let one user write to or read another user's objects.", "Authorize the object owner or tenant and use isolated storage keys with safe download URLs.", ["static", "test"], ["app", "pages", "src"], (context) => signal(context, "upload_authorization", "No upload authorization or storage-boundary signal was detected.")),
  control("SEC-WEBHOOK-001", "Webhook authenticity", "security", "critical", ["webhooks", "payments"], "Unsigned provider payloads let attackers manufacture state transitions and payments.", "Verify the provider signature against the raw body before interpreting an event.", ["static", "test"], ["app", "pages", "src"], (context) => signal(context, "webhook_signature", "Webhook capability was detected without signature verification signals.")),
  control("SEC-WEBHOOK-002", "Webhook replay and idempotency", "reliability", "high", ["webhooks", "payments"], "Providers retry events and attackers may replay valid payloads; a handler must make duplicate processing safe.", "Persist event identity, reject stale/replayed deliveries, and make state transitions idempotent.", ["static", "test"], ["app", "pages", "src"], (context) => signal(context, "idempotency", "No replay-protection or idempotency signal was detected.")),
  control("SEC-RATE-001", "Rate and abuse limiting", "security", "high", ["public_api", "llm_generation", "payments"], "Public or expensive endpoints can be exhausted even when individual requests are valid.", "Apply an identity/IP-aware limit with bounded concurrency and an actionable 429 response.", ["static", "test"], ["middleware.ts", "app", "pages", "src"], (context) => signal(context, "rate_limit", "No rate-limiting or abuse-response signal was detected.")),
  control("SEC-ADMIN-001", "Administrative authorization", "authorization", "critical", ["admin_panel"], "Administrative routes have disproportionate impact and require explicit privileged authorization.", "Require a server-side role/permission check for every administrative read and mutation.", ["static", "test"], ["app", "pages", "middleware.ts"], (context) => signal(context, "authorization", "Administrative surface detected without an authorization signal.")),
  control("OBS-LOG-001", "Structured request logging", "observability", "medium", ["public_api", "payments", "llm_generation"], "Without structured request context, failures and abuse are difficult to correlate or investigate.", "Emit structured logs with request IDs and operation context while excluding sensitive values.", ["static", "test"], ["src", "app", "pages"], (context) => signal(context, "structured_logging", "No structured logging signal was detected.")),
  control("OBS-REDACT-001", "Sensitive log redaction", "observability", "high", ["user_authentication", "payments", "llm_generation"], "Logs often outlive application data and can expose credentials, tokens, or personal data.", "Redact sensitive fields before logging and test representative error paths.", ["static", "test"], ["src", "app", "pages"], (context) => signal(context, "sensitive_log_redaction", "No sensitive-log redaction signal was detected.")),
  control("DB-MIGRATION-001", "Safe database migrations", "database", "high", ["database_postgres", "database_prisma"], "A non-null or destructive migration can fail existing rows or cause downtime.", "Use expand/contract sequencing, backfills, constraints after data is valid, and a rollback plan.", ["static", "test"], ["prisma/migrations", "migrations", "db"], (context) => {
    const surface = context.discovery.signals.migration_surface;
    const risk = context.discovery.signals.migration_risk;
    if (!surface) return { outcome: "unknown", summary: "No migration files were detected.", details: ["Migration safety is unassessed until a database migration surface is present."], files: [] };
    if (risk) return { outcome: "fail", summary: "Potential destructive or non-null migration detected.", details: ["Review the migration with expand/contract sequencing, backfills, constraints after data is valid, and a rollback plan."], files: [...new Set([...surface.files, ...risk.files])].sort() };
    return { outcome: "unknown", summary: "Migration files were detected but their rollout safety is unverified.", details: ["Review migration ordering, backfills, constraints, lock duration, and rollback behavior before release."], files: surface.files };
  }),
  control("DB-INDEX-001", "Indexes for access paths", "database", "medium", ["database_postgres", "multi_tenancy"], "Tenant and high-cardinality lookup paths degrade as data grows without indexes aligned to actual queries.", "Add and verify indexes for tenant, ownership, uniqueness, and frequent lookup predicates.", ["static", "test"], ["prisma/schema.prisma", "migrations", "db"], (context) => anySignal(context, ["database_index", "database_constraints"], "No database index or constraint signal was detected.")),
  control("DB-QUERY-001", "Bounded data access", "database", "high", ["database_postgres", "public_api"], "Unbounded reads can exhaust memory and create latency/cost incidents as the dataset grows.", "Use pagination, limits, selective fields, and explicit ordering for user-controlled collections.", ["static", "test"], ["app", "pages", "src"], (context) => signal(context, "query_bounds", "No pagination, limit, or bounded-query signal was detected.")),
  control("REL-TIMEOUT-001", "External call timeouts", "reliability", "high", ["external_api", "llm_generation", "payments", "object_storage"], "A provider that never returns can consume request and worker capacity indefinitely.", "Set provider-specific deadlines and propagate cancellation through the call chain.", ["static", "test"], ["app", "pages", "src"], (context) => signal(context, "timeout", "No timeout or cancellation signal was detected for external calls.")),
  control("REL-RETRY-001", "Bounded retry behavior", "reliability", "medium", ["external_api", "llm_generation", "payments"], "Unbounded or synchronized retries amplify provider failures and cost.", "Retry only transient failures with caps, backoff, jitter, and an overall deadline.", ["static", "test"], ["app", "pages", "src"], (context) => signal(context, "retry", "No bounded retry/backoff signal was detected.")),
  control("REL-HEALTH-001", "Health and readiness signal", "reliability", "medium", ["public_api"], "Deployments and operators need a cheap way to distinguish process health from dependency readiness.", "Expose a documented health endpoint and a separate readiness check where dependencies require it.", ["static", "test"], ["app", "pages", "src"], (context) => signal(context, "health_endpoint", "No health or readiness endpoint signal was detected.")),
  control("COST-AI-001", "AI spend and concurrency limits", "cost", "high", ["llm_generation"], "An unbounded AI endpoint creates an economic denial-of-service path.", "Enforce per-user/IP quota, concurrency caps, provider timeout, and a system budget.", ["static", "test"], ["app", "pages", "src"], (context) => signal(context, "ai_quota", "No AI quota, budget, or concurrency-limit signal was detected.")),
  control("COST-AI-002", "AI payload and token bounds", "cost", "high", ["llm_generation"], "Large prompts, outputs, or agent loops can create uncontrolled provider cost and latency.", "Bound input size, output tokens, tool calls, and agent steps at the server boundary.", ["static", "test"], ["app", "pages", "src"], (context) => signal(context, "ai_payload_bounds", "No token, payload, or loop bound signal was detected.")),
  control("AI-OUTPUT-001", "AI output validation", "ai", "high", ["llm_generation"], "Model output is untrusted and can violate schemas or drive unsafe downstream operations.", "Validate structured output before persistence, rendering, or tool invocation and fail closed on invalid data.", ["static", "test"], ["app", "pages", "src"], (context) => signal(context, "ai_output_validation", "No AI output schema or validation signal was detected.")),
  control("AI-INPUT-001", "Prompt and tool trust boundary", "ai", "critical", ["llm_generation"], "User-controlled content can attempt prompt injection or cause an agent to invoke privileged tools.", "Separate instructions from untrusted data, constrain tool permissions, and validate tool arguments server-side.", ["static", "test"], ["app", "pages", "src"], (context) => signal(context, "ai_input_boundary", "No prompt-injection boundary or tool-permission signal was detected.")),
  control("AI-TOOL-001", "Agent tool permission boundary", "ai", "critical", ["agentic_operations"], "An agent that can invoke tools may cross filesystem, database, communication, infrastructure, or financial boundaries unless each operation is explicitly constrained.", "Declare an allowlist and least-privilege policy for tools, validate arguments server-side, and keep destructive or financial operations behind an explicit authorization boundary.", ["static", "test"], ["app", "pages", "src", "tools"], (context) => {
    const operations = context.discovery.signals.agent_operations;
    const boundary = context.discovery.signals.agent_permission_boundary;
    const dangerous = context.discovery.signals.agent_dangerous_operation;
    if (boundary) return { outcome: "pass", summary: "Agent/tool operations include an explicit permission-boundary signal.", details: [`Observed ${boundary.matches} permission-boundary signal${boundary.matches === 1 ? "" : "s"}${dangerous ? ` alongside ${dangerous.matches} operation signal${dangerous.matches === 1 ? "" : "s"}` : ""}.`], files: [...new Set([...boundary.files, ...(operations?.files ?? []), ...(dangerous?.files ?? [])])].sort() };
    return { outcome: "fail", summary: "Agent/tool operations detected without an explicit permission boundary.", details: ["Declare allowed tools, validate tool arguments, and classify destructive or financial operations before invocation."], files: [...new Set([...(operations?.files ?? []), ...(dangerous?.files ?? [])])].sort() };
  }),
  control("PAY-VALIDATE-001", "Server-side payment validation", "payments", "critical", ["payments"], "Client-controlled prices and state cannot be trusted for a financial operation.", "Resolve prices and currency server-side and verify provider state before recording payment success.", ["static", "test"], ["app", "pages", "src"], (context) => signal(context, "payment_validation", "No server-side payment amount or provider-state validation signal was detected.")),
  control("PAY-OBS-001", "Payment failure visibility", "payments", "high", ["payments"], "Silent provider or reconciliation failures create financial and support incidents.", "Persist provider event identity and record success, failure, and reconciliation outcomes without sensitive payloads.", ["static", "test"], ["app", "pages", "src"], (context) => anySignal(context, ["idempotency", "observability", "error_reporting"], "No payment event or failure-observability signal was detected.")),
  control("SUPPLY-LOCK-001", "Pinned dependency resolution", "supply-chain", "high", [], "Without a lockfile, two installs can resolve different dependency graphs.", "Commit the lockfile used by the selected package manager and validate it in CI.", ["static", "test"], ["package-lock.json", "pnpm-lock.yaml", "yarn.lock", "bun.lockb"], lockfile),
  control("SUPPLY-SECRET-001", "Environment secret boundary", "supply-chain", "high", [], "A committed environment file can disclose credentials to every repository reader.", "Commit only example variable names; keep local and deployment secret files ignored.", ["static", "test"], [".gitignore", ".env.example"], (context) => {
    const localEnv = context.snapshot.files.filter((file) => /^\.env(?:\.|$)/.test(file.path) && !file.path.includes(".example"));
    return localEnv.length ? { outcome: "fail", summary: "Environment secret file present in the inspection scope.", details: ["Confirm it is ignored and never committed; ProductionOS cannot inspect remote history in this check."], files: localEnv.map((file) => file.path) } : { outcome: "pass", summary: "No local environment secret file was included in the inspection scope.", details: ["This check does not inspect repository history."], files: [".gitignore"] };
  }),
  control("OPS-BACKUP-001", "Backup and restore evidence", "operations", "high", ["database_postgres"], "Configured backups do not prove that recovery is possible within the required objective.", "Document backup freshness, restore procedure, restore-test evidence, and recovery objectives.", ["test", "runtime"], ["docs", "runbooks", "infra", "scripts"], backupReadiness),
  control("SEC-SSRF-001", "Outbound request target validation", "security", "high", ["external_api", "object_storage"], "Server-side fetches can be abused to reach internal services or cloud metadata.", "Allowlist destinations or validate schemes, hosts, redirects, and response sizes before fetching.", ["static", "test"], ["app", "pages", "src"], (context) => signal(context, "outbound_target_validation", "No outbound target validation signal was detected."))
];

function active(definition: ControlDefinition, capabilities: CapabilityGraph): string[] {
  if (definition.triggerCapabilities.length === 0) return [];
  return definition.triggerCapabilities.filter((id) => capabilities.nodes.some((node) => node.id === id));
}

function statusFor(outcome: CheckResult["outcome"]): ControlFinding["status"] {
  if (outcome === "pass") return "INFERRED";
  if (outcome === "fail") return "FAILED";
  return "UNASSESSED";
}

export function evaluateControls(context: EvaluationContext): ControlFinding[] {
  return CONTROL_DEFINITIONS.map((definition) => {
    const triggeredBy = active(definition, context.capabilities);
    if (definition.triggerCapabilities.length > 0 && triggeredBy.length === 0) {
      return {
        controlId: definition.id,
        version: VERSION,
        title: definition.title,
        domain: definition.domain,
        severity: definition.severity,
        status: "NOT_APPLICABLE",
        summary: "Capability trigger is not active.",
        rationale: definition.rationale,
        recommendation: definition.recommendation,
        verification: [...definition.verification],
        affectedFiles: [...definition.affectedFiles],
        triggeredBy,
        evaluatedAt: new Date().toISOString()
      };
    }
    const result = definition.check(context);
    return {
      controlId: definition.id,
      version: VERSION,
      title: definition.title,
      domain: definition.domain,
      severity: definition.severity,
      status: statusFor(result.outcome),
      summary: result.summary,
      rationale: definition.rationale,
      recommendation: `${definition.recommendation} ${result.details.join(" ")}`,
      verification: [...definition.verification],
      affectedFiles: [...new Set([...definition.affectedFiles, ...result.files])],
      triggeredBy,
      evaluatedAt: new Date().toISOString()
    };
  });
}

export function verifyStaticControls(context: EvaluationContext, findings: ControlFinding[]): ControlFinding[] {
  const byId = new Map(CONTROL_DEFINITIONS.map((definition) => [definition.id, definition]));
  return findings.map((finding) => {
    if (finding.status === "NOT_APPLICABLE" || !finding.verification.includes("static")) return finding;
    const definition = byId.get(finding.controlId);
    if (!definition) return finding;
    const result = definition.check(context);
    const status: ControlFinding["status"] = result.outcome === "pass" ? "STATICALLY_VERIFIED" : result.outcome === "fail" ? "FAILED" : "UNASSESSED";
    return { ...finding, status, summary: result.summary, affectedFiles: [...new Set([...finding.affectedFiles, ...result.files])], evaluatedAt: new Date().toISOString() };
  });
}

export function requirementsForCapabilities(capabilities: CapabilityGraph): RequirementGraph {
  const activeCapabilities = new Set(capabilities.nodes.map((node) => node.id));
  const definitions = CONTROL_DEFINITIONS.filter((definition) => definition.triggerCapabilities.length === 0 || definition.triggerCapabilities.some((id) => activeCapabilities.has(id)));
  const requirements: RequirementDefinition[] = definitions.map(({ check: _check, ...requirement }) => requirement);
  const edges: RequirementGraph["edges"] = definitions.flatMap((definition) => definition.triggerCapabilities.filter((id) => activeCapabilities.has(id)).map((id) => ({ from: id, to: definition.id, kind: "activates" as const, reason: `Capability ${id} activates ${definition.id}.` })));
  const dependencies: Array<[string, string, string]> = [
    ["SEC-WEBHOOK-001", "SEC-WEBHOOK-002", "Replay protection is meaningful only after webhook authenticity is established."],
    ["SEC-AUTH-001", "SEC-AUTHZ-001", "Authorization relies on a trustworthy authenticated identity."],
    ["SEC-TENANT-001", "SEC-AUTHZ-001", "Tenant isolation is an authorization/data-access consequence."],
    ["COST-AI-001", "COST-AI-002", "Spend limits require both request budgets and bounded model payloads."],
    ["AI-INPUT-001", "AI-TOOL-001", "Prompt trust boundaries must be paired with explicit permissions when an agent can invoke tools."],
    ["PAY-VALIDATE-001", "SEC-WEBHOOK-001", "Provider state validation must not trust unsigned payment events."]
  ];
  for (const [from, to, reason] of dependencies) {
    if (definitions.some((definition) => definition.id === from) && definitions.some((definition) => definition.id === to)) edges.push({ from, to, kind: "depends_on", reason });
  }
  return { schemaVersion: REQUIREMENT_GRAPH_SCHEMA_VERSION, generatedAt: new Date().toISOString(), requirements, edges: edges.sort((left, right) => `${left.from}:${left.to}`.localeCompare(`${right.from}:${right.to}`)) };
}

export function controlById(id: string): ControlDefinition | undefined {
  return CONTROL_DEFINITIONS.find((definition) => definition.id.toLowerCase() === id.toLowerCase());
}

export function policyVersion(): string {
  return VERSION;
}
