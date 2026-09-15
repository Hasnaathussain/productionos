# ADR-0005: Use a strict TypeScript local-first monorepo for v0.1

- **Status:** Accepted
- **Date:** 2026-09-14

## Context

The initial supported ecosystem and target CLI are TypeScript/Next.js-oriented. Phase 1 requires a monorepo, installable CLI, manifest validation, state management, logging, error handling, and tests. No existing source or package manager contract is present.

## Decision

Use npm workspaces with strict TypeScript, Node's standard library for process/filesystem boundaries, the `yaml` package for the required YAML manifest format, and Node's built-in test runner. Keep packages separated by lifecycle responsibility and avoid a hosted service or database.

## Reason

This matches the supported stack, keeps local installation conventional, minimizes runtime dependencies, and makes deterministic CLI tests possible without requiring an external service.

## Tradeoffs and revisit conditions

Relative package imports are acceptable during the foundation but may be promoted to explicit workspace package exports when the module contracts stabilize. A new runtime dependency or infrastructure service requires evidence that the platform or current design cannot satisfy the requirement.
