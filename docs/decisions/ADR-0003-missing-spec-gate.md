# ADR-0003: Do not invent runtime behavior when the master specification is absent

- **Status:** Superseded after `docs/MASTER_SPEC.md` was restored
- **Date:** 2026-09-14

## Context

The requested build is supposed to proceed from `docs/MASTER_SPEC.md`, but that file is currently empty. The repository contains no source or tests that can supply the missing contract.

## Decision

Complete the documentation-only Phase 0 using only confirmed repository instructions and the product description. Hold substantial runtime implementation until a non-empty master specification or an explicit human product decision supplies the roadmap and acceptance criteria.

## Consequences

- Phase 0 was completed while the specification was absent and recorded the exact blocker.
- The provisional documents were reconciled against the restored specification before runtime implementation began.
- This ADR remains as historical recovery context; it no longer blocks implementation.
