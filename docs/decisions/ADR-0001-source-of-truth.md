# ADR-0001: Repository documents are the durable source of truth

- **Status:** Accepted for Phase 0
- **Date:** 2026-09-14

## Context

ProductionOS must survive context compression and new sessions. Conversation history is not a reliable durable interface between agents or between an agent and a reviewer.

## Decision

Use repository-resident documentation and evidence records as the durable project state. `docs/MASTER_SPEC.md` is the normative product contract when populated. `docs/DEVELOPMENT_STATE.md` is the recovery point for current work. Product, MVP, architecture, control-model, and ADR documents explain decisions without overriding the master specification.

## Consequences

- A new session can recover from files rather than memory.
- Documentation updates are part of significant milestones.
- Conflicts are resolved in favor of the master specification, with the conflict recorded for human review.
- Phase 0 was documentation-first while the specification was unavailable. After `docs/MASTER_SPEC.md` was restored, the repository became the source of truth for both the executable engine and its durable product/recovery records.
