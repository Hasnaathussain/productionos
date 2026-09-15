# ADR-0011: Simplification is advisory and never claims safe removal

- **Status:** Accepted
- **Date:** 2026-09-14

## Context

ProductionOS should resist unjustified architecture and dependency complexity, but static repository inspection cannot prove that a dependency is unused: scripts, configuration, generated code, JavaScript files, and deployment manifests may consume it.

## Decision

`prodos simplify` compares declared runtime dependencies with bounded TypeScript import facts and optionally reviews infrastructure-heavy dependencies against an explicitly declared small user scale. It emits low-confidence review candidates, a `NO_ACTION` decision when none are observed, limitations, and no file mutations. It never labels a package safe to remove.

## Verification

The SaaS fixture produces review candidates, while the minimal Next.js fixture produces `NO_ACTION`. Package tests assert both outcomes and the advisory limitation language.
