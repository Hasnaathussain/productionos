# ProductionOS MVP

**Status:** v0.1 contract derived from `docs/MASTER_SPEC.md`.

## MVP objective

A developer should be able to run the following against a TypeScript/Next.js-style repository:

```bash
npx productionos init
npx productionos inspect
npx productionos audit
npx productionos verify
npx productionos gate
```

The result must be useful, correct, scriptable, and backed by durable evidence rather than fabricated scores.

## Included capability

1. A strict TypeScript monorepo and installable CLI.
2. Versioned `.productionos/manifest.yaml` with profile-aware configuration.
3. Durable state, reports, evidence, waivers, and compact `status --json` output.
4. Deterministic Next.js-focused repository discovery.
5. A normalized capability graph and capability-triggered requirement graph.
6. Approximately 25–40 high-value controls with stable IDs, severities, explanations, and verification contracts.
7. Static verification, optional repository test execution, persisted evidence, and relevant evidence invalidation.
8. Profile-aware `gate`, explicit waivers, and clear human/JSON/CI output.
9. Portable agent skill instructions with progressive context loading.
10. Fixture-based tests, a real benchmark dataset, a reproducible intentionally flawed demo, CI, and OSS documentation.

## Profiles

The manifest supports `prototype`, `public`, `saas`, `business_critical`, and `regulated`. Controls may be irrelevant, unassessed, or blocking depending on capabilities and profile. A waiver remains visible and never becomes a pass.

## Acceptance gates

- `init` creates a valid project state without overwriting existing configuration unexpectedly.
- `inspect` produces deterministic structured discovery and capability artifacts from fixtures.
- `audit` activates relevant controls only and reports why each finding exists.
- `verify` produces attributable static/test evidence and never promotes an unavailable check.
- Changing a control-relevant file invalidates only affected evidence.
- `gate` blocks when profile-required critical/high controls are failed or unverified, unless explicitly waived.
- Every user-facing claim can be traced to a source file, command result, runtime observation, or human waiver.
- All core behavior is covered by deterministic unit, integration, fixture, CLI, and benchmark-regression tests appropriate to the milestone.

## Deferred beyond the first release

Hosted collaboration, broad framework adapters, autonomous remediation, attack/chaos execution, load execution against external environments, a dashboard, plugin marketplace, and production deployment integrations are deliberately deferred until the local engine is trustworthy. Bounded loopback load measurement is included for local development.
