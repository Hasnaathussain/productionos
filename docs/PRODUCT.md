# ProductionOS Product Definition

**Status:** Phase 0 reconciled with `docs/MASTER_SPEC.md`; v0.1 public release prepared under Apache-2.0.

## Product

ProductionOS is the production-engineering layer for AI coding agents. It analyzes a repository, infers the application model and capabilities, activates the production controls those capabilities require, verifies those controls independently, and preserves evidence that a human or later agent can inspect.

The central promise is not a readiness score. It is a defensible chain:

```text
user intent -> discovery -> capability graph -> requirements -> implementation
-> independent verification -> evidence -> production gate -> drift detection
```

## Problem

AI coding tools can create a convincing feature while leaving important production concerns unexamined: authorization boundaries, tenant isolation, webhook replay, unbounded AI spend, unsafe uploads, missing timeouts, weak observability, migration hazards, and recovery gaps. A user often does not know which questions to ask.

ProductionOS makes those hidden requirements explicit, explains why they matter, and refuses to treat code presence or an agent assertion as proof that a control works.

## Users and use cases

- A developer can run `prodos init`, `inspect`, `audit`, `verify`, and `gate` in a repository.
- An AI coding agent can retrieve only relevant controls, files, constraints, and evidence for a task.
- A reviewer can see findings, accepted waivers, verification status, and the exact evidence behind a gate.
- A maintainer can add adapters and controls without changing the core lifecycle.

## Differentiation

ProductionOS is complementary to existing analysis tools. Semgrep and CodeQL provide powerful static-analysis engines; OpenSSF Scorecard evaluates repository security practices; agent-skill catalogs distribute instructions. ProductionOS owns the application-model and production-control lifecycle that connects intent, capabilities, requirements, implementation, verification, evidence, and release gating.

## Initial scope

The first supported ecosystem is TypeScript applications centered on Next.js App Router, PostgreSQL, Prisma/Supabase, Auth.js/Supabase Auth, Stripe, OpenAI-compatible APIs, S3-compatible storage, Vercel, Vitest, Playwright, and GitHub Actions. Adapters must remain replaceable so breadth can grow after depth is proven.

The first release prioritizes repository-local operation and controls for authentication, authorization, tenancy, secrets, uploads, webhooks, rate limiting, AI cost, database safety, timeouts, logging, observability, and supply chain hygiene.

## Trust, privacy, and threat model

- Source code stays local by default; no telemetry or source upload is implicit.
- External tools are optional and must fail clearly when unavailable.
- Subprocesses use argument arrays and explicit working directories; shell interpolation is not an execution primitive.
- The tool must not silently modify the target repository, contact production systems, or claim compliance certification.
- Evidence is produced by deterministic checks, test execution, runtime probes, or explicit human waivers—not by LLM prose.
- A malicious or malformed target repository is treated as untrusted input. Discovery and policy evaluation must avoid arbitrary code execution.

## Explicit non-goals for v0.1

- A hosted dashboard, billing system, cloud account, or mandatory backend.
- A generic multi-language scanner or a marketplace for plugins.
- Automatic production deployment or destructive remediation.
- Compliance certification or a single numeric readiness score.
- Blind repository rewrites and controls that cannot explain their evidence.
