import { access, readFile, writeFile } from "node:fs/promises";
import { constants } from "node:fs";
import { dirname } from "node:path";
import { mkdir } from "node:fs/promises";
import { parse, stringify } from "yaml";
import { MANIFEST_VERSION, ProductionOSError, type DiscoveryResult, type MaturityProfile, type ProjectManifest, type ValidationIssue } from "../../../packages/core/src/index.js";

const PROFILES: readonly MaturityProfile[] = ["prototype", "public", "saas", "business_critical", "regulated"];
const ROOT_KEYS = new Set(["version", "project", "runtime", "database", "auth", "payments", "uploads", "ai", "data", "scale", "reliability"]);
const NESTED_KEYS: Record<string, Set<string>> = {
  project: new Set(["type", "maturity"]),
  runtime: new Set(["framework", "deployment", "language"]),
  database: new Set(["provider", "orm"]),
  auth: new Set(["enabled", "provider"]),
  payments: new Set(["enabled", "provider"]),
  uploads: new Set(["enabled", "storage"]),
  ai: new Set(["enabled", "provider"]),
  data: new Set(["pii"]),
  scale: new Set(["expected_users"]),
  reliability: new Set(["availability_target"])
};
const NESTED_TYPES: Record<string, Record<string, "string" | "boolean" | "string[]" | "number">> = {
  runtime: { framework: "string", deployment: "string", language: "string" },
  database: { provider: "string", orm: "string" },
  auth: { enabled: "boolean", provider: "string" },
  payments: { enabled: "boolean", provider: "string" },
  uploads: { enabled: "boolean", storage: "string" },
  ai: { enabled: "boolean", provider: "string" },
  data: { pii: "string[]" },
  scale: { expected_users: "number" },
  reliability: { availability_target: "number" }
};

export function defaultManifest(): ProjectManifest {
  return {
    version: MANIFEST_VERSION,
    project: { type: "unknown", maturity: "prototype" },
    runtime: { language: "typescript" }
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

export function validateManifest(input: unknown): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  if (!isRecord(input)) return [{ path: "", message: "manifest must be a mapping" }];
  for (const key of Object.keys(input)) if (!ROOT_KEYS.has(key)) issues.push({ path: key, message: "unknown field" });
  if (input.version !== MANIFEST_VERSION) issues.push({ path: "version", message: "must be version 1" });
  const project = input.project;
  if (!isRecord(project)) issues.push({ path: "project", message: "must be a mapping" });
  else {
    if (typeof project.type !== "string" || project.type.length === 0) issues.push({ path: "project.type", message: "must be a non-empty string" });
    if (!PROFILES.includes(project.maturity as MaturityProfile)) issues.push({ path: "project.maturity", message: `must be one of ${PROFILES.join(", ")}` });
  }
  for (const path of ["runtime", "database", "auth", "payments", "uploads", "ai", "data", "scale", "reliability"]) {
    const value = input[path];
    if (value !== undefined && !isRecord(value)) issues.push({ path, message: "must be a mapping when provided" });
    else if (isRecord(value)) {
      for (const key of Object.keys(value)) {
        if (!NESTED_KEYS[path]?.has(key)) {
          issues.push({ path: `${path}.${key}`, message: "unknown field" });
          continue;
        }
        const expected = NESTED_TYPES[path]?.[key];
        const actual = value[key];
        const valid = expected === "string" ? typeof actual === "string" : expected === "boolean" ? typeof actual === "boolean" : expected === "number" ? typeof actual === "number" : Array.isArray(actual) && actual.every((item) => typeof item === "string");
        if (!valid) issues.push({ path: `${path}.${key}`, message: `must be ${expected}` });
      }
    }
  }
  const expectedUsers = isRecord(input.scale) ? input.scale.expected_users : undefined;
  if (expectedUsers !== undefined && (typeof expectedUsers !== "number" || !Number.isInteger(expectedUsers) || expectedUsers < 0)) issues.push({ path: "scale.expected_users", message: "must be a non-negative integer" });
  const availabilityTarget = isRecord(input.reliability) ? input.reliability.availability_target : undefined;
  if (availabilityTarget !== undefined && (typeof availabilityTarget !== "number" || !Number.isFinite(availabilityTarget) || availabilityTarget <= 0 || availabilityTarget > 100)) issues.push({ path: "reliability.availability_target", message: "must be a finite number greater than 0 and at most 100" });
  return issues;
}

export function parseManifest(content: string, source = "manifest.yaml"): ProjectManifest {
  let parsed: unknown;
  try {
    parsed = parse(content);
  } catch (error) {
    throw new ProductionOSError("MANIFEST_PARSE", `Unable to parse ${source}: ${error instanceof Error ? error.message : String(error)}`);
  }
  const issues = validateManifest(parsed);
  if (issues.length) {
    throw new ProductionOSError("MANIFEST_INVALID", `${source} is invalid:\n${issues.map((issue) => `- ${issue.path || "root"}: ${issue.message}`).join("\n")}`);
  }
  return parsed as ProjectManifest;
}

export async function loadManifest(path: string): Promise<ProjectManifest> {
  try {
    return parseManifest(await readFile(path, "utf8"), path);
  } catch (error) {
    if (error instanceof ProductionOSError) throw error;
    throw new ProductionOSError("MANIFEST_MISSING", `Manifest not found at ${path}. Run 'prodos init' first.`);
  }
}

export async function writeManifest(path: string, manifest: ProjectManifest): Promise<void> {
  const issues = validateManifest(manifest);
  if (issues.length) throw new ProductionOSError("MANIFEST_INVALID", issues.map((issue) => `${issue.path}: ${issue.message}`).join("\n"));
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, stringify(manifest), "utf8");
}

export async function initializeManifest(path: string, force = false): Promise<ProjectManifest> {
  if (!force) {
    try {
      await access(path, constants.F_OK);
      throw new ProductionOSError("MANIFEST_EXISTS", `Manifest already exists at ${path}; use --force to replace it.`);
    } catch (error) {
      if (error instanceof ProductionOSError) throw error;
    }
  }
  const manifest = defaultManifest();
  await writeManifest(path, manifest);
  return manifest;
}

export function updateManifestFromDiscovery(manifest: ProjectManifest, discovery: DiscoveryResult): ProjectManifest {
  const dependencies = new Set(discovery.dependencies);
  const authProvider = dependencies.has("next-auth") || dependencies.has("@auth/core") ? "authjs" : dependencies.has("@supabase/auth-js") || dependencies.has("@supabase/ssr") ? "supabase" : dependencies.has("@clerk/nextjs") ? "clerk" : undefined;
  const paymentProvider = dependencies.has("stripe") || dependencies.has("@stripe/stripe-js") ? "stripe" : undefined;
  const aiProvider = dependencies.has("openai") || dependencies.has("@ai-sdk/openai") ? "openai" : dependencies.has("@anthropic-ai/sdk") ? "anthropic" : undefined;
  const uploadProvider = dependencies.has("@aws-sdk/client-s3") ? "s3" : dependencies.has("@supabase/storage-js") ? "supabase" : dependencies.has("uploadthing") ? "uploadthing" : undefined;
  const databaseProvider = discovery.signals.supabase ? "supabase" : discovery.signals.postgres ? "postgres" : undefined;
  const next: ProjectManifest = {
    ...manifest,
    project: manifest.project.type === "unknown" && discovery.framework ? { ...manifest.project, type: "nextjs_application" } : manifest.project,
    runtime: {
      ...manifest.runtime,
      language: discovery.language,
      ...(manifest.runtime?.framework === undefined && discovery.framework ? { framework: discovery.framework } : {}),
      ...(manifest.runtime?.deployment === undefined && discovery.deployment ? { deployment: discovery.deployment } : {})
    }
  };
  if (discovery.signals.postgres || discovery.signals.prisma || discovery.signals.supabase) {
    next.database = {
      ...manifest.database,
      ...(manifest.database?.provider === undefined && databaseProvider ? { provider: databaseProvider } : {}),
      ...(manifest.database?.orm === undefined && discovery.signals.prisma ? { orm: "prisma" } : {})
    };
  }
  if (discovery.signals.auth) next.auth = { ...manifest.auth, enabled: true, ...(manifest.auth?.provider === undefined && authProvider ? { provider: authProvider } : {}) };
  if (discovery.signals.stripe) next.payments = { ...manifest.payments, enabled: true, ...(manifest.payments?.provider === undefined && paymentProvider ? { provider: paymentProvider } : {}) };
  if (discovery.signals.ai) next.ai = { ...manifest.ai, enabled: true, ...(manifest.ai?.provider === undefined && aiProvider ? { provider: aiProvider } : {}) };
  if (discovery.signals.uploads) next.uploads = { ...manifest.uploads, enabled: true, ...(manifest.uploads?.storage === undefined && uploadProvider ? { storage: uploadProvider } : {}) };
  return next;
}
