# ADR-0018: Run target tests through a fixed package-manager allowlist

- **Status:** Accepted
- **Date:** 2026-09-14

## Context

Discovery already identifies the target package manager, but always invoking `npm test` makes verification inaccurate for repositories whose lockfile and scripts use another supported manager. At the same time, a package-manager field is repository-controlled input and must not become an arbitrary executable.

## Decision

Test verification selects only `npm`, `pnpm`, `yarn`, or `bun`; unknown or absent values use the documented `npm` fallback. Windows uses the corresponding command shim through the existing explicit `cmd.exe` argument boundary. The selected command is persisted in the evidence record.

## Verification

Verifier tests assert the POSIX and Windows command shapes for each recognized manager and the safe fallback for unknown input.
