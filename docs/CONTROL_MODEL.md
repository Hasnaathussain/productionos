# ProductionOS Control Model

**Status:** v0.1 lifecycle contract derived from `docs/MASTER_SPEC.md`.

## Lifecycle

```text
INTENT -> DISCOVERED -> MODELED -> REQUIRED -> PLANNED -> IMPLEMENTED
                                                    |
                                                    v
                                      VERIFIED -> EVIDENCED -> GATED
```

Controls may also be `UNASSESSED`, `INFERRED`, `FAILED`, `NOT_APPLICABLE`, `WAIVED`, or `STALE`. A gate is an aggregate decision, not a replacement for individual control status.

## Control record

Every control has a stable ID, version, domain, title, severity, rationale, failure modes, tradeoffs, capability trigger, affected-file hints, verification methods, explicit evidence requirements, limitations, a false-positive boundary, and a deterministic evaluator. Optional remediation metadata must include preconditions, risk, rollback guidance, and tests before it can be automated. The requirement graph carries this metadata under schema version 3, while control policy version 1.2.0 invalidates evidence created against the prior catalog.

## Evidence statuses

```text
UNASSESSED
INFERRED
STATICALLY_VERIFIED
TEST_VERIFIED
RUNTIME_VERIFIED
WAIVED
FAILED
NOT_APPLICABLE
STALE
```

`INFERRED` means the repository appears to contain a relevant implementation but no independent proof exists. A verified status always points to reproducible evidence. A waiver is risk acceptance, not verification.

## Gate rules

- The active profile determines which severity levels block release.
- `FAILED`, `UNASSESSED`, `INFERRED`, and `STALE` controls block when their severity is required by the profile.
- `WAIVED` controls remain visible and include owner, reason, and optional expiry.
- `NOT_APPLICABLE` is valid only when its trigger is demonstrably inactive.
- Missing or failed verification never becomes a pass through omission or wording.
- Counts are explanatory; the gate decision derives from individual records.

## Independent verification

The builder and verifier are separate conceptual roles. Static checks inspect source without executing it. Test verification runs an explicitly selected local test command and captures exit status/output. Runtime verification is reserved for authorized local/test/staging targets. ProductionOS itself never silently probes arbitrary third-party production systems.

## Safety boundaries

Default operations are local and read-only. The CLI must not upload source, deploy, spend money, rotate secrets, delete resources, or perform destructive migrations. Attack, load, chaos, fix, and launch integrations must have explicit authorization and environment boundaries.

## Recovery

`prodos status --json` is the compact recovery surface. `docs/DEVELOPMENT_STATE.md` records the state of building ProductionOS itself. Target repositories record current milestone, generated artifacts, stale evidence, blockers, and next recommended work in `.productionos/state.json`.
