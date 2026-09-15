import { readFile, readdir } from "node:fs/promises";
import { join, relative, resolve } from "node:path";
import { DISCOVERY_SCHEMA_VERSION, type DiscoveryResult, type RouteFact, type SignalEvidence } from "../../../packages/core/src/index.js";
import { analyzeTypeScriptFiles } from "./ast.js";

const IGNORED = new Set([".git", ".next", ".productionos", "node_modules", "dist", "build", "coverage", ".turbo"]);
const SOURCE_EXTENSIONS = /\.(?:ts|tsx|js|jsx|mjs|cjs|sql|prisma)$/i;
const TEXT_EXTENSIONS = /\.(?:ts|tsx|js|jsx|mjs|cjs|json|yaml|yml|toml|md|sql|prisma|config)$/i;
const MAX_FILES = 1200;
const MAX_FILE_BYTES = 512 * 1024;

interface FileContent {
  path: string;
  content: string;
}

async function collectFiles(root: string, current: string, output: string[]): Promise<void> {
  if (output.length >= MAX_FILES) return;
  const entries = await readdir(current, { withFileTypes: true });
  for (const entry of entries.sort((left, right) => left.name.localeCompare(right.name))) {
    if (output.length >= MAX_FILES) return;
    const path = join(current, entry.name);
    if (entry.isDirectory()) {
      if (!IGNORED.has(entry.name)) await collectFiles(root, path, output);
    } else if (entry.isFile() && (TEXT_EXTENSIONS.test(entry.name) || entry.name === "Dockerfile" || entry.name.startsWith(".env"))) {
      output.push(relative(root, path).replaceAll("\\", "/"));
    }
  }
}

async function readTextFiles(root: string, paths: string[]): Promise<FileContent[]> {
  const files: FileContent[] = [];
  for (const path of paths) {
    try {
      const content = await readFile(join(root, path), "utf8");
      if (Buffer.byteLength(content, "utf8") <= MAX_FILE_BYTES) files.push({ path, content });
    } catch {
      // A file can disappear while an inspection is running; it is simply not evidence.
    }
  }
  return files;
}

function addSignal(signals: Record<string, SignalEvidence>, name: string, path: string, matches = 1): void {
  const current = signals[name] ?? { files: [], matches: 0 };
  if (!current.files.includes(path)) current.files.push(path);
  current.matches += matches;
  signals[name] = current;
}

function signalFromDependencies(signals: Record<string, SignalEvidence>, dependencies: Set<string>, name: string, packages: string[]): void {
  const found = packages.filter((dependency) => dependencies.has(dependency));
  if (found.length) {
    for (const dependency of found) addSignal(signals, name, "package.json");
  }
}

function routeFromFile(path: string, content: string): RouteFact | null {
  const normalized = path.replaceAll("\\", "/");
  const normalizeSegment = (part: string): string => part
    .replace(/^\[\[\.\.\.([^\]]+)\]\]$/, ":$1?")
    .replace(/^\[\.\.\.([^\]]+)\]$/, ":$1")
    .replace(/^\[([^\]]+)\]$/, ":$1");
  const appPrefix = normalized.startsWith("src/app/") ? "src/app/" : normalized.startsWith("app/") ? "app/" : null;
  if (appPrefix && /(?:^|\/)route\.(?:ts|tsx|js|jsx)$/.test(normalized.slice(appPrefix.length))) {
    const suffix = normalized.slice(appPrefix.length).replace(/(?:^|\/)route\.[^.]+$/, "");
    const route = `/${suffix.split("/").filter((part) => part && !/^\([^)]*\)$/.test(part)).map(normalizeSegment).join("/")}`;
    const methodNames = "GET|POST|PUT|PATCH|DELETE|OPTIONS|HEAD";
    const methods = [
      ...content.matchAll(new RegExp(`export\\s+(?:async\\s+)?function\\s+(${methodNames})\\b`, "g")),
      ...content.matchAll(new RegExp(`export\\s+(?:const|let|var)\\s+(${methodNames})\\s*=`, "g"))
    ].map((match) => match[1] as string);
    return { path: route === "/" ? "/" : route.replace(/\/$/, ""), file: normalized, kind: "app-route", methods: [...new Set(methods)].sort() };
  }
  const pagesPrefix = normalized.startsWith("src/pages/api/") ? "src/pages/api/" : normalized.startsWith("pages/api/") ? "pages/api/" : null;
  if (pagesPrefix && /\.(?:ts|tsx|js|jsx)$/.test(normalized)) {
    const suffix = normalized.slice(pagesPrefix.length).replace(/\.[^.]+$/, "").replace(/(^|\/)index$/, "");
    const routeSuffix = suffix.split("/").filter(Boolean).map(normalizeSegment).join("/");
    return { path: routeSuffix ? `/api/${routeSuffix}` : "/api", file: normalized, kind: "pages-api", methods: ["handler"] };
  }
  if (appPrefix && /(?:^|\/)page\.(?:ts|tsx|js|jsx)$/.test(normalized.slice(appPrefix.length))) {
    const suffix = normalized.slice(appPrefix.length).replace(/(?:^|\/)page\.[^.]+$/, "");
    const route = `/${suffix.split("/").filter((part) => part && !/^\([^)]*\)$/.test(part)).map(normalizeSegment).join("/")}`;
    return { path: route === "/" ? "/" : route.replace(/\/$/, ""), file: normalized, kind: "page", methods: [] };
  }
  if (/\buse server\b/.test(content) || /(^|\/)actions\.[^.]+$/.test(normalized)) return { path: normalized, file: normalized, kind: "server-action", methods: [] };
  return null;
}

function countMatches(content: string, pattern: RegExp): number {
  const flags = pattern.flags.includes("g") ? pattern.flags : `${pattern.flags}g`;
  return [...content.matchAll(new RegExp(pattern.source, flags))].length;
}

function detectSignals(files: FileContent[], dependencies: Set<string>, routes: RouteFact[], packageJsonPath: string): Record<string, SignalEvidence> {
  const signals: Record<string, SignalEvidence> = {};
  signalFromDependencies(signals, dependencies, "next", ["next"]);
  signalFromDependencies(signals, dependencies, "prisma", ["prisma", "@prisma/client"]);
  signalFromDependencies(signals, dependencies, "postgres", ["pg", "postgres", "postgresql", "@prisma/client", "@supabase/supabase-js"]);
  signalFromDependencies(signals, dependencies, "supabase", ["@supabase/supabase-js", "@supabase/ssr"]);
  signalFromDependencies(signals, dependencies, "auth", ["next-auth", "@auth/core", "@supabase/auth-js", "@supabase/ssr", "@clerk/nextjs"]);
  signalFromDependencies(signals, dependencies, "stripe", ["stripe", "@stripe/stripe-js"]);
  signalFromDependencies(signals, dependencies, "ai", ["openai", "@ai-sdk/openai", "ai", "@anthropic-ai/sdk"]);
  signalFromDependencies(signals, dependencies, "uploads", ["uploadthing", "multer", "formidable", "@aws-sdk/client-s3", "@supabase/storage-js"]);
  signalFromDependencies(signals, dependencies, "external_api", ["axios", "undici", "got", "node-fetch"]);
  signalFromDependencies(signals, dependencies, "background_jobs", ["bullmq", "bull", "bee-queue", "inngest", "@trigger.dev/sdk", "@upstash/qstash", "agenda", "node-cron", "cron"]);
  signalFromDependencies(signals, dependencies, "queue", ["bullmq", "bull", "bee-queue", "inngest", "@trigger.dev/sdk", "@upstash/qstash", "agenda"]);
  signalFromDependencies(signals, dependencies, "cron_jobs", ["node-cron", "cron", "@vercel/cron"]);
  signalFromDependencies(signals, dependencies, "email_delivery", ["resend", "nodemailer", "postmark", "@sendgrid/mail", "mailgun.js"]);
  if (routes.some((route) => route.kind === "app-route" || route.kind === "pages-api")) addSignal(signals, "public_api", packageJsonPath);

  const patterns: Array<[string, RegExp]> = [
    ["auth", /next-auth|supabase.*auth|createServerClient|createClient.*supabase|signIn|getServerSession|auth\(\)|session\.user/i],
    ["authorization", /\b(?:authorize|authorize(?:Upload|File|Request|Action|Access|Role)|require(?:[A-Z]\w*)?Role|hasRole|isAdmin|isAuthorized|check(?:Permission|Access)|assert(?:Role|Permission))\b|\b(?:user|session|claims|account)\.role\b|\b(?:can|may)(?:Access|Edit|Manage|Read|Write|Delete)\s*\(/i],
    ["multi_tenancy", /tenantId|organizationId|workspaceId|tenant|organization|workspace/i],
    ["security_headers", /Content-Security-Policy|Strict-Transport-Security|X-Content-Type-Options|securityHeaders|headers\(\)/i],
    ["csrf", /csrf|sameSite|origin.*referer|verifyOrigin/i],
    ["cors", /Access-Control-Allow|cors\(|allowedOrigins/i],
    ["input_validation", /\b(?:zod|valibot|yup|joi|superstruct|safeParse|validator)\b|\b(?:z|schema|validator|bodySchema|inputSchema)\.(?:safeParse|parse)\(/i],
    ["upload_limits", /maxFileSize|maxSize|content-length|fileSize|mime|contentType|multipart/i],
    ["upload_authorization", /signedUrl|getSignedUrl|authorize.*upload|upload.*authorize|storage\.from/i],
    ["webhook_signature", /constructEvent|webhook.*signature|signature.*webhook|x-signature|stripe-signature/i],
    ["idempotency", /idempotenc|processedEvent|eventId|dedup|replay/i],
    ["rate_limit", /rateLimit|rateLimiter|upstash.*ratelimit|Retry-After|status\s*[:=]\s*429/i],
    ["observability", /opentelemetry|@sentry|captureException|prom-client|metrics|tracing|traceId|requestId/i],
    ["structured_logging", /pino|winston|logger\.(info|warn|error|debug)|structured.?log/i],
    ["sensitive_log_redaction", /redact|scrub|mask|sanitize.*log/i],
    ["timeout", /AbortController|AbortSignal|signal\s*[:=]|timeout|Promise\.race/i],
    ["retry", /retry|backoff|p-retry|exponential/i],
    ["health_endpoint", /health|readiness|liveness|readyz|livez/i],
    ["ai_quota", /quota|usageLimit|perUser|perIP|perIp|concurrency|spend|budget/i],
    ["ai_payload_bounds", /max[_A-Za-z]*tokens|maxTokens|token.*limit|maxSteps|tool.*calls?|prompt.*limit|input.*limit/i],
    ["ai_output_validation", /structuredOutputs?|outputSchema|responseSchema|safeParse|zod.*output|validate.*response/i],
    ["ai_input_boundary", /prompt injection|untrusted.*prompt|sanitize.*prompt|tool.*permission|system.*prompt/i],
    ["agent_operations", /\b(?:function_call|tool_calls?|tool_choice|registerTool|createTool|executeTool|agent(?:Loop|Step)|maxSteps)\b|\btools\s*[:=]/i],
    ["agent_permission_boundary", /allowedTools|toolPermissions?|permissionPolicy|authorizeTool|validateTool|leastPrivilege|readOnly/i],
    ["agent_dangerous_operation", /\b(?:execute|delete|write|send|mutate)\s*[:(]/i],
    ["payment_validation", /amount.*(server|validated)|validate.*amount|currency.*(server|validated)|checkout.*validation/i],
    ["database_index", /@@index|CREATE\s+INDEX|createIndex/i],
    ["database_constraints", /@@unique|@@id|FOREIGN KEY|CHECK\s*\(/i],
    ["query_bounds", /(?:limit|take|skip|cursor|pagination|pageSize|page_size|findMany[^\n]{0,80}(?:take|skip|cursor))/i],
    ["outbound_target_validation", /allowed(?:Hosts|Origins|Targets)|allowlist|validate.*(?:url|host|target)|redirect\s*:\s*["']error["']/i],
    ["error_reporting", /@sentry|captureException|errorReporter|reportError/i],
    ["external_api", /\bfetch\s*\(\s*(?:["'`]https?:\/\/|process\.env\.[A-Z0-9_]+|import\.meta\.env\.[A-Z0-9_]+)/i]
  ];
  const operationalPatterns: Array<[string, RegExp]> = [
    ["backup_configured", /backup|pg_dump|snapshot|point.?in.?time/i],
    ["restore_documented", /restore|recovery point|disaster recovery|recovery procedure/i],
    ["restore_tested", /restore[\s_-]*(?:test|drill)|(?:test|drill)[^\n]{0,40}restore/i],
    ["backup_freshness", /(?:backup|snapshot)[^\n]{0,80}(?:daily|hourly|weekly|retention|freshness|retention policy)/i],
    ["recovery_objective", /\b(?:RPO|RTO|recovery point objective|recovery time objective|recovery objective)\b/i]
  ];
  for (const file of files) {
    const sourceLike = SOURCE_EXTENSIONS.test(file.path) || file.path.endsWith("package.json") || file.path.startsWith(".env");
    const operationalLike = /(?:^|\/)(?:docs|runbooks|infra|scripts)\//i.test(file.path) || /(?:backup|restore|recovery)/i.test(file.path);
    if (/(^|\/)(?:src\/)?middleware\.(?:ts|tsx|js|jsx)$/.test(file.path)) addSignal(signals, "middleware", file.path);
    if (/(^|\/)(?:workers?|queues?|jobs?)(?:\/|[-_.])/i.test(file.path)) {
      addSignal(signals, "background_jobs", file.path);
      addSignal(signals, "queue", file.path);
    }
    if (/(^|\/)(?:cron|schedules?)(?:\/|[-_.])/i.test(file.path)) {
      addSignal(signals, "background_jobs", file.path);
      addSignal(signals, "cron_jobs", file.path);
    }
    if (/(^|\/)(?:email|mail)(?:\/|[-_.])/i.test(file.path)) addSignal(signals, "email_delivery", file.path);
    if (sourceLike) {
      for (const [name, pattern] of patterns) {
        const matches = countMatches(file.content, pattern);
        if (matches) addSignal(signals, name, file.path, matches);
      }
      if (/(^|\/)(?:prisma\/migrations|migrations|db\/migrations)\//i.test(file.path)) {
        addSignal(signals, "migration_surface", file.path);
        const riskMatches = countMatches(file.content, /NOT\s+NULL|DROP\s+(?:COLUMN|TABLE|INDEX|SCHEMA)|TRUNCATE\s+(?:TABLE\s+)?[A-Z0-9_"`.[\]-]+/i);
        if (riskMatches) addSignal(signals, "migration_risk", file.path, riskMatches);
      }
    }
    if (sourceLike || operationalLike) {
      for (const [name, pattern] of operationalPatterns) {
        const matches = countMatches(file.content, pattern);
        if (matches) addSignal(signals, name, file.path, matches);
      }
    }
    if (/console\.(?:log|error|warn)\([^\n]*(?:password|secret|token|authorization|cookie)/i.test(file.content)) addSignal(signals, "sensitive_logging", file.path);
    if (/process\.env\.[A-Z0-9_]+|import\.meta\.env\.[A-Z0-9_]+/.test(file.content)) addSignal(signals, "environment_usage", file.path);
  }
  return signals;
}

function environmentVariables(files: FileContent[]): string[] {
  const names = new Set<string>();
  for (const file of files) {
    for (const match of file.content.matchAll(/process\.env\.([A-Z0-9_]+)|import\.meta\.env\.([A-Z0-9_]+)/g)) {
      const name = match[1] ?? match[2];
      if (name) names.add(name);
    }
    if (file.path.startsWith(".env") && !file.path.includes(".local") && !file.path.includes(".production")) {
      for (const match of file.content.matchAll(/^\s*([A-Z][A-Z0-9_]*)\s*(?:=|$)/gm)) names.add(match[1] as string);
    }
  }
  return [...names].sort();
}

function detectDeployment(files: FileContent[]): string | null {
  const paths = new Set(files.map((file) => file.path));
  if (paths.has("vercel.json") || [...paths].some((path) => path.startsWith(".vercel/"))) return "vercel";
  if (paths.has("wrangler.toml") || paths.has("wrangler.json") || paths.has("wrangler.jsonc")) return "cloudflare";
  if (paths.has("render.yaml") || paths.has("render.yml")) return "render";
  if (paths.has("fly.toml")) return "fly";
  if (paths.has("netlify.toml")) return "netlify";
  if ([...paths].some((path) => path === "Dockerfile" || path.endsWith("/Dockerfile"))) return "docker";
  return null;
}

export async function discoverRepository(rootInput: string): Promise<DiscoveryResult> {
  const root = resolve(rootInput);
  const relativePaths: string[] = [];
  await collectFiles(root, root, relativePaths);
  const files = await readTextFiles(root, relativePaths);
  const packageFile = files.find((file) => file.path === "package.json");
  let packageJson: { dependencies?: Record<string, string>; devDependencies?: Record<string, string>; scripts?: Record<string, string>; packageManager?: string } = {};
  if (packageFile) {
    try { packageJson = JSON.parse(packageFile.content) as typeof packageJson; } catch { /* invalid package files are reported through unknown detection */ }
  }
  const dependencies = new Set([...Object.keys(packageJson.dependencies ?? {}), ...Object.keys(packageJson.devDependencies ?? {})]);
  const sourceFiles = files.filter((file) => SOURCE_EXTENSIONS.test(file.path)).map((file) => file.path).sort();
  const configFiles = files.filter((file) => !SOURCE_EXTENSIONS.test(file.path)).map((file) => file.path).sort();
  const routes = files.map((file) => routeFromFile(file.path, file.content)).filter((route): route is RouteFact => route !== null).sort((left, right) => left.path.localeCompare(right.path) || left.file.localeCompare(right.file));
  const signals = detectSignals(files, dependencies, routes, packageFile?.path ?? "package.json");
  const ast = analyzeTypeScriptFiles(files);
  const hasTypeScript = sourceFiles.some((path) => /\.tsx?$/.test(path));
  const hasLockfile = files.some((file) => ["package-lock.json", "pnpm-lock.yaml", "yarn.lock", "bun.lockb"].includes(file.path));
  const packageManager = packageJson.packageManager?.split("@")[0] ?? (files.some((file) => file.path === "pnpm-lock.yaml") ? "pnpm" : files.some((file) => file.path === "yarn.lock") ? "yarn" : files.some((file) => file.path === "bun.lockb") ? "bun" : hasLockfile ? "npm" : "unknown");
  const framework = signals.next ? "nextjs" : null;
  return {
    schemaVersion: DISCOVERY_SCHEMA_VERSION,
    generatedAt: new Date().toISOString(),
    root,
    filesScanned: files.length,
    language: hasTypeScript ? "typescript" : sourceFiles.length ? "javascript" : "unknown",
    packageManager,
    framework,
    deployment: detectDeployment(files),
    dependencies: [...(packageJson.dependencies ? Object.keys(packageJson.dependencies) : [])].sort(),
    devDependencies: [...(packageJson.devDependencies ? Object.keys(packageJson.devDependencies) : [])].sort(),
    sourceFiles,
    configFiles,
    routes,
    environmentVariables: environmentVariables(files),
    signals,
    ast,
    toolchain: {
      hasTests: Boolean(packageJson.scripts?.test) || sourceFiles.some((path) => /(?:\.test|\.spec)\./.test(path)),
      hasCi: files.some((file) => file.path.startsWith(".github/workflows/")),
      hasContainer: files.some((file) => file.path === "Dockerfile" || file.path.endsWith("/Dockerfile")),
      hasLockfile
    }
  };
}
