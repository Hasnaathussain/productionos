# ADR-0007: Invalidate evidence from affected-file hints and fingerprints

- **Status:** Accepted
- **Date:** 2026-09-14

## Context

Evidence must not survive a relevant repository change, but rerunning every control after every edit would be slow and would waste agent context. The master specification requires targeted invalidation and preservation of unrelated evidence.

## Decision

Each evidence record stores affected-file hints and an input fingerprint. Freshness recomputes the fingerprint over the files selected by those hints, including newly created files under a hinted directory. A changed policy version or changed relevant files makes the record stale; unrelated files do not.

## Alternatives considered

- Whole-repository fingerprints: simple, but unrelated edits invalidate all evidence.
- Manual agent invalidation: low implementation cost, but not trustworthy or reproducible.
- Runtime dependency tracing: more precise in theory, but outside the v0.1 deterministic contract and unsafe to require during read-only discovery.

## Verification

The evidence package tests both targeted file changes and directory-hint changes, including the case where a new relevant file appears.
