import { GRAPH_SCHEMA_VERSION, type CapabilityGraph, type CapabilityNode, type DiscoveryResult } from "../../../packages/core/src/index.js";

function node(id: string, label: string, confidence: CapabilityNode["confidence"], evidence: string[]): CapabilityNode {
  return { id, label, confidence, evidence: [...new Set(evidence)].sort() };
}

export function buildCapabilityGraph(discovery: DiscoveryResult): CapabilityGraph {
  const nodes: CapabilityNode[] = [];
  const add = (id: string, label: string, confidence: CapabilityNode["confidence"], evidence: string[]): void => {
    if (!nodes.some((current) => current.id === id)) nodes.push(node(id, label, confidence, evidence));
  };
  const evidence = (signal: string): string[] => discovery.signals[signal]?.files ?? [];

  if (discovery.signals.auth) add("user_authentication", "User authentication", "high", evidence("auth"));
  if (discovery.signals.authorization || discovery.signals.auth) add("authorization", "Authorization boundaries", discovery.signals.authorization ? "medium" : "low", evidence("authorization"));
  if (discovery.signals.multi_tenancy) add("multi_tenancy", "Multi-tenant data or organization scope", "medium", evidence("multi_tenancy"));
  if (discovery.signals.stripe) add("payments", "Payments", "high", evidence("stripe"));
  if (discovery.signals.ai) add("llm_generation", "LLM generation", "high", evidence("ai"));
  if (discovery.signals.agent_operations) add("agentic_operations", "Agentic tool operations", "high", [...evidence("agent_operations"), ...evidence("agent_dangerous_operation")]);
  if (discovery.signals.uploads) add("file_uploads", "File uploads", "high", evidence("uploads"));
  if (discovery.signals.webhook_signature || discovery.routes.some((route) => /webhook/i.test(route.path) || /webhook/i.test(route.file))) add("webhooks", "Inbound webhooks", "medium", discovery.signals.webhook_signature?.files ?? discovery.routes.filter((route) => /webhook/i.test(route.path) || /webhook/i.test(route.file)).map((route) => route.file));
  if (discovery.signals.uploads && (discovery.signals.supabase || discovery.dependencies.some((dependency) => /s3|storage|uploadthing/i.test(dependency)))) add("object_storage", "Object storage", "medium", [...evidence("uploads"), ...evidence("supabase")]);
  if (discovery.signals.postgres) add("database_postgres", "PostgreSQL data", "high", evidence("postgres"));
  if (discovery.signals.prisma) add("database_prisma", "Prisma data access", "high", evidence("prisma"));
  if (discovery.signals.public_api) add("public_api", "HTTP/API endpoints", "high", discovery.routes.map((route) => route.file));
  if (discovery.signals.external_api || discovery.signals.ai || discovery.signals.stripe) add("external_api", "External service calls", discovery.signals.external_api ? "medium" : "low", [...evidence("external_api"), ...evidence("ai"), ...evidence("stripe")]);
  if (discovery.routes.some((route) => /admin/i.test(route.path) || /admin/i.test(route.file))) add("admin_panel", "Administrative surface", "medium", discovery.routes.filter((route) => /admin/i.test(route.path) || /admin/i.test(route.file)).map((route) => route.file));
  const jobEvidence = [...evidence("background_jobs"), ...evidence("queue"), ...evidence("cron_jobs")];
  const legacyJobEvidence = discovery.sourceFiles.filter((path) => /worker|queue|job|cron/i.test(path));
  if (jobEvidence.length || discovery.dependencies.some((dependency) => /bullmq|bull|inngest|trigger\.dev|agenda|node-cron/i.test(dependency)) || legacyJobEvidence.length) add("background_jobs", "Background jobs", "medium", [...jobEvidence, ...legacyJobEvidence]);
  const emailEvidence = evidence("email_delivery");
  const legacyEmailEvidence = discovery.sourceFiles.filter((path) => /email|mail/i.test(path));
  if (emailEvidence.length || discovery.dependencies.some((dependency) => /resend|nodemailer|postmark|sendgrid|mailgun/i.test(dependency)) || legacyEmailEvidence.length) add("email_delivery", "Email delivery", "medium", [...emailEvidence, ...legacyEmailEvidence]);

  const edges: CapabilityGraph["edges"] = [];
  const connect = (from: string, to: string, reason: string): void => {
    if (nodes.some((current) => current.id === from) && nodes.some((current) => current.id === to)) edges.push({ from, to, reason });
  };
  connect("payments", "webhooks", "Payment providers commonly deliver asynchronous state through signed webhooks.");
  connect("payments", "external_api", "Payment processing depends on a provider outside the repository.");
  connect("llm_generation", "external_api", "Model calls cross a provider boundary.");
  connect("llm_generation", "public_api", "AI endpoints can expose an expensive public request surface.");
  connect("file_uploads", "object_storage", "Uploads usually cross an object-storage boundary.");
  connect("multi_tenancy", "authorization", "Tenant scope must be enforced at authorization and data access boundaries.");
  connect("user_authentication", "authorization", "An authenticated identity is not sufficient without authorization checks.");
  connect("database_prisma", "database_postgres", "Prisma is an ORM/data access layer over the detected PostgreSQL database.");
  return {
    schemaVersion: GRAPH_SCHEMA_VERSION,
    generatedAt: new Date().toISOString(),
    nodes: nodes.sort((left, right) => left.id.localeCompare(right.id)),
    edges: edges.sort((left, right) => `${left.from}:${left.to}`.localeCompare(`${right.from}:${right.to}`))
  };
}
