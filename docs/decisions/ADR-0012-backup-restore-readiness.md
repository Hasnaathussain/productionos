# ADR-0012: Separate backup configuration from restore proof

- **Status:** Accepted
- **Date:** 2026-09-14

## Context

The master specification explicitly warns that enabled backups do not prove recoverability. A source repository may describe backups or a restore procedure without having executed a restore drill.

## Decision

Discovery records separate `backup_configured`, `backup_freshness`, `restore_documented`, `recovery_objective`, and `restore_tested` signals from bounded source/runbook paths. `OPS-BACKUP-001` remains `UNASSESSED` unless independent test or runtime evidence is available; even a restore-test description produces an unresolved finding with a limitation, not a verified pass.

## Verification

The SaaS fixture remains unassessed for backup readiness, and a runbook fixture proves that freshness and recovery-objective descriptions are observed without becoming restore proof.
