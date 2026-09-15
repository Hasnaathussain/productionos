# ProductionOS Architecture

**Status:** Public v0.1 architecture for the local-first engine; hosted and high-risk execution features remain outside this release.

## Design objective

Provide a local-first, deterministic engine that transforms a repository into an inspectable production model and preserves the evidence needed to decide whether it can launch.

```text
Coding agent / CLI
        |
        v
  Core lifecycle
        |
  discovery -> application model -> capability graph
        |                                  |
        +------------> policy/requirements-+
                                      |
                                      v
                         static/test/runtime verification
                                      |
                                      v
                              evidence + invalidation
                                      |
                                      v
                               profile-aware gate
```

## Repository layout

```text
apps/cli/                  executable `prodos` entry point
packages/core/             shared contracts, paths, hashing, errors
packages/manifest/         YAML schema and defaults
packages/state/            `.productionos` persistence and recovery state
packages/discovery/        deterministic repository inspection
packages/graph/            capability and requirement graph normalization
packages/policy/           versioned control definitions and evaluation
packages/verifier/         independent static/test verification orchestration
packages/runtime/          explicitly authorized local runtime/load measurements
packages/simplify/         conservative dependency and complexity advisory
packages/operations/       SLO objectives and operational readiness reports
packages/evidence/         evidence records, fingerprints, invalidation
packages/reporting/        human and JSON output models
policies/                  declarative/control documentation boundary
fixtures/                  intentionally representative repositories
benchmarks/                measured detection regression cases
skills/productionos/       portable agent interface after core works
docs/                      product, architecture, controls, ADRs, state
```

The monorepo uses TypeScript with strict compiler settings and minimal runtime dependencies. Modules communicate through versioned plain data contracts. The CLI is a thin orchestrator; it must not own business logic.

## Durable state

Each inspected target repository owns its `.productionos/` directory:

```text
.productionos/
├── manifest.yaml
├── discovery.json
├── capabilities.json
├── requirements.json
├── state.json
├── evidence/
├── waivers/
├── remediations/
└── reports/
```

Files are human-readable where practical and machine-readable where consumed by tools. State is regenerated deterministically from repository inputs; evidence records carry the input fingerprint and become stale when relevant files or policy versions change.

## Trust boundaries

- The target repository is untrusted input. Parsing is read-only by default.
- Discovery reads bounded, ignored-aware files and does not import or execute target code.
- Policy checks are pure functions over a snapshot of source metadata/content.
- Test execution is an explicit subprocess boundary with an allowlisted command shape and captured output.
- Optional external scanners are adapters, never mandatory product dependencies.
- Runtime/load measurements require an explicit command boundary and loopback authorization in v0.1.
- LLMs may explain or plan; they cannot create verification evidence.

## Extension points

Discovery adapters emit normalized application facts. Policy controls consume capabilities and facts. Verification adapters emit evidence with a method and provenance. This keeps framework, database, provider, and scanner additions independent of the core lifecycle.

## Complexity boundary

No hosted database, queue, Redis, dashboard, or model provider is required for v0.1. Plain files are sufficient for local state and improve portability, auditability, and recovery. A new infrastructure dependency requires a documented demonstrated need and an ADR.
