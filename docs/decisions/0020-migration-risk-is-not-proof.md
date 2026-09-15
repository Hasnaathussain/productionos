# ADR-0020: Migration risk is not migration proof

## Status

Accepted

## Context

Database migration files are a high-value review surface. A migration containing a non-null constraint or destructive schema operation can fail existing rows, hold locks, or make rollback difficult. Merely finding a migration file, however, does not prove that its rollout is safe.

## Decision

Discovery emits separate `migration_surface` and `migration_risk` signals only for recognized migration paths. The policy treats a migration surface without a recognized risk pattern as unassessed, and treats recognized non-null or destructive operations as a failed control requiring staged review. Neither result is presented as runtime execution evidence.

## Consequences

This preserves a useful deterministic warning without claiming that static text analysis understands data volume, rollout ordering, lock duration, backfills, or rollback behavior. Future migration adapters can add execution evidence without changing the meaning of the static signals.
