import test from "node:test";
import assert from "node:assert/strict";
import { mkdir, mkdtemp, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { tmpdir } from "node:os";
import { discoverRepository } from "./index.js";

const fixture = resolve(dirname(fileURLToPath(import.meta.url)), "../../../../fixtures/nextjs-saas");
const minimalFixture = resolve(dirname(fileURLToPath(import.meta.url)), "../../../../fixtures/minimal-next");

test("discovery detects the supported Next.js SaaS fixture", async () => {
  const result = await discoverRepository(fixture);
  assert.equal(result.framework, "nextjs");
  assert.equal(result.language, "typescript");
  assert.equal(result.packageManager, "npm");
  assert.equal(result.toolchain.hasLockfile, true);
  assert.ok(result.signals.stripe);
  assert.ok(result.signals.ai);
  assert.ok(result.signals.prisma);
  assert.equal(result.signals.input_validation, undefined);
  assert.equal(result.signals.agent_operations, undefined);
  const generateAst = result.ast.files.find((file) => file.path === "app/api/generate/route.ts");
  assert.ok(generateAst?.imports.includes("openai"));
  assert.ok(generateAst?.calls.includes("client.responses.create"));
  assert.ok(result.routes.some((route) => route.path === "/api/generate"));
  assert.ok(result.routes.some((route) => route.path === "/api/payments/webhook"));
});

test("discovery is stable for structural output", async () => {
  const first = await discoverRepository(fixture);
  const second = await discoverRepository(fixture);
  assert.deepEqual({
    language: first.language,
    packageManager: first.packageManager,
    framework: first.framework,
    deployment: first.deployment,
    dependencies: first.dependencies,
    devDependencies: first.devDependencies,
    sourceFiles: first.sourceFiles,
    configFiles: first.configFiles,
    routes: first.routes,
    environmentVariables: first.environmentVariables,
    signals: first.signals,
    toolchain: first.toolchain
  }, {
    language: second.language,
    packageManager: second.packageManager,
    framework: second.framework,
    deployment: second.deployment,
    dependencies: second.dependencies,
    devDependencies: second.devDependencies,
    sourceFiles: second.sourceFiles,
    configFiles: second.configFiles,
    routes: second.routes,
    environmentVariables: second.environmentVariables,
    signals: second.signals,
    toolchain: second.toolchain
  });
});

test("discovery does not infer unrelated capabilities from a minimal Next.js app", async () => {
  const result = await discoverRepository(minimalFixture);
  assert.equal(result.framework, "nextjs");
  assert.equal(result.deployment, "vercel");
  assert.equal(result.routes[0]?.path, "/");
  assert.equal(result.signals.stripe, undefined);
  assert.equal(result.signals.ai, undefined);
  assert.equal(result.signals.uploads, undefined);
  assert.equal(result.signals.public_api, undefined);
});

test("discovery normalizes src-based Next.js route layouts", async () => {
  const root = await mkdtemp(resolve(tmpdir(), "productionos-src-layout-"));
  await mkdir(resolve(root, "src/app/api/users"), { recursive: true });
  await mkdir(resolve(root, "src/app/api/const-handler"), { recursive: true });
  await mkdir(resolve(root, "src/app/docs/[...slug]"), { recursive: true });
  await mkdir(resolve(root, "src/pages/api"), { recursive: true });
  await mkdir(resolve(root, "src/pages/api/users"), { recursive: true });
  await writeFile(resolve(root, "package.json"), JSON.stringify({ dependencies: { next: "^15.0.0" } }), "utf8");
  await writeFile(resolve(root, "src/app/api/users/route.ts"), "export async function GET() { return Response.json({}); }\n", "utf8");
  await writeFile(resolve(root, "src/app/api/const-handler/route.ts"), "export const POST = async () => Response.json({});\n", "utf8");
  await writeFile(resolve(root, "src/app/docs/[...slug]/route.ts"), "export async function GET() { return Response.json({}); }\n", "utf8");
  await writeFile(resolve(root, "src/app/actions.ts"), "\"use server\"; export async function saveProfile() {}\n", "utf8");
  await writeFile(resolve(root, "src/pages/api/legacy.ts"), "export default function handler() {}\n", "utf8");
  await writeFile(resolve(root, "src/pages/api/users/[id].ts"), "export default function handler() {}\n", "utf8");
  await writeFile(resolve(root, "src/pages/api/index.ts"), "export default function handler() {}\n", "utf8");
  const result = await discoverRepository(root);
  assert.ok(result.routes.some((route) => route.path === "/api/users" && route.file === "src/app/api/users/route.ts"));
  assert.ok(result.routes.some((route) => route.path === "/api/const-handler" && route.methods.includes("POST")));
  assert.ok(result.routes.some((route) => route.path === "/docs/:slug" && route.file === "src/app/docs/[...slug]/route.ts"));
  assert.ok(result.routes.some((route) => route.kind === "server-action" && route.file === "src/app/actions.ts"));
  assert.ok(result.routes.some((route) => route.path === "/api/legacy" && route.file === "src/pages/api/legacy.ts"));
  assert.ok(result.routes.some((route) => route.path === "/api/users/:id" && route.file === "src/pages/api/users/[id].ts"));
  assert.ok(result.routes.some((route) => route.path === "/api" && route.file === "src/pages/api/index.ts"));
});

test("discovery emits bounded operational integration signals", async () => {
  const root = await mkdtemp(resolve(tmpdir(), "productionos-operational-signals-"));
  await mkdir(resolve(root, "workers"), { recursive: true });
  await mkdir(resolve(root, "cron"), { recursive: true });
  await mkdir(resolve(root, "email"), { recursive: true });
  await writeFile(resolve(root, "package.json"), JSON.stringify({ dependencies: { bullmq: "5.0.0", "node-cron": "3.0.0", resend: "4.0.0" } }), "utf8");
  await writeFile(resolve(root, "middleware.ts"), "export function middleware() { return Response.next(); }\n", "utf8");
  await writeFile(resolve(root, "workers/send.ts"), "export async function send() {}\n", "utf8");
  await writeFile(resolve(root, "cron/nightly.ts"), "export function nightly() {}\n", "utf8");
  await writeFile(resolve(root, "email/client.ts"), "export function sendEmail() {}\n", "utf8");
  const result = await discoverRepository(root);
  assert.ok(result.signals.middleware);
  assert.ok(result.signals.background_jobs);
  assert.ok(result.signals.queue);
  assert.ok(result.signals.cron_jobs);
  assert.ok(result.signals.email_delivery);
});

test("discovery does not treat an accessibility role attribute as authorization", async () => {
  const root = await mkdtemp(resolve(tmpdir(), "productionos-authorization-boundary-"));
  await mkdir(resolve(root, "app"), { recursive: true });
  await writeFile(resolve(root, "package.json"), JSON.stringify({ dependencies: { next: "^15.0.0" } }), "utf8");
  await writeFile(resolve(root, "app/page.tsx"), "const copy = \"authorized\"; export default function Page() { return <button role=\"button\">{copy}</button>; }\n", "utf8");
  const result = await discoverRepository(root);
  assert.equal(result.signals.authorization, undefined);
});

test("discovery detects native fetch only at an explicit external boundary", async () => {
  const externalRoot = await mkdtemp(resolve(tmpdir(), "productionos-fetch-external-"));
  await mkdir(resolve(externalRoot, "app/api"), { recursive: true });
  await writeFile(resolve(externalRoot, "package.json"), JSON.stringify({ dependencies: { next: "^15.0.0" } }), "utf8");
  await writeFile(resolve(externalRoot, "app/api/route.ts"), "export async function GET() { return Response.json(await fetch(process.env.UPSTREAM_URL as string)); }\n", "utf8");
  const external = await discoverRepository(externalRoot);
  assert.ok(external.signals.external_api);

  const internalRoot = await mkdtemp(resolve(tmpdir(), "productionos-fetch-internal-"));
  await mkdir(resolve(internalRoot, "app/api"), { recursive: true });
  await writeFile(resolve(internalRoot, "package.json"), JSON.stringify({ dependencies: { next: "^15.0.0" } }), "utf8");
  await writeFile(resolve(internalRoot, "app/api/route.ts"), "export async function GET() { return Response.json(await fetch(\"/api/health\")); }\n", "utf8");
  const internal = await discoverRepository(internalRoot);
  assert.equal(internal.signals.external_api, undefined);
});
