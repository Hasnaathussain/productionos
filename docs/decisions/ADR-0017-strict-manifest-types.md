# ADR-0017: Validate manifest field types before discovery consumes them

- **Status:** Accepted
- **Date:** 2026-09-14

## Context

Unknown-field rejection prevents typos, but a versioned manifest is not safe to consume if known fields can contain arbitrary YAML types. The CLI and policy engine rely on typed provider, feature, and data-sensitivity values.

## Decision

Manifest v1 validates nested string, boolean, string-array, and numeric fields before returning a `ProjectManifest`. Range checks remain explicit for expected users and availability objectives. Invalid manifests fail closed with field paths and do not reach discovery or policy evaluation.

## Verification

Manifest tests cover malformed nested field types in addition to unknown fields and numeric range validation.
