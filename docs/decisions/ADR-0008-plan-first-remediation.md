# ADR-0008: Remediation is plan-first and preconditioned

- **Status:** Accepted
- **Date:** 2026-09-14

## Context

Automatic changes can introduce more risk than the control they are intended to fix. The master specification requires scoped, explainable remediation with verification and rollback information, and says architecture-sensitive fixes need stronger analysis.

## Decision

`prodos fix <CONTROL_ID>` creates a durable remediation plan before any file mutation. Only a low-risk, preconditioned security-header fix is currently eligible for `--apply`. The implementation refuses to overwrite an existing middleware file, records the applied plan under `.productionos/remediations/`, and does not create verification evidence automatically. Unsupported controls return explicit plans rather than fake success.

## Alternatives considered

- Broad automatic rewrites: faster on paper, but unsafe without framework- and repository-specific contracts.
- Prompt-only suggestions: safer, but lacks a durable plan and clear rollback boundary.
- Silent evidence creation after a write: invalid because the builder would be certifying its own change.

## Verification

Unit tests cover ready, blocked, and unsupported plans. A clean temporary Next.js fixture run exercised apply, reinspection, and static verification; the other fixture findings remained independent.
