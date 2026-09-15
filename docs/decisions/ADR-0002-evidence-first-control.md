# ADR-0002: Completion requires attributable deterministic evidence

- **Status:** Accepted for Phase 0
- **Date:** 2026-09-14

## Context

AI agents can produce confident summaries that do not prove a change works. ProductionOS is explicitly intended to be evidence-driven and must not weaken tests or treat an LLM assertion as verification.

## Decision

Separate claims from evidence. A completion claim must point to a reproducible command/tool result with its inputs, exit status, context, and limitations. Failed, skipped, or unavailable checks remain visible and prevent completion when they are required by the acceptance criteria.

## Consequences

- Verification output needs a durable representation.
- Natural-language summaries are views over evidence, not evidence themselves.
- Work may remain blocked when a deterministic check cannot run; this is preferable to an unsupported success claim.
- The first implementation should avoid infrastructure that does not improve evidence quality.
