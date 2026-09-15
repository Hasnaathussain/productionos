# ADR-0014: Provide a compact agent-oriented control explanation

- **Status:** Accepted
- **Date:** 2026-09-14

## Context

The agent workflow must retrieve only the control context relevant to the current change. The full human explanation is useful at a terminal but needlessly expands an agent's context and does not expose a stable compact shape.

## Decision

`prodos explain <CONTROL_ID> --agent --json` returns the control identity, rationale, recommendation, verification methods, affected-file hints, safe constraints, and the next verification command. `prodos context --task` uses deterministic field matching plus a small documented vocabulary for common task terms such as checkout, login, upload, and AI. Neither command creates evidence or changes repository files.

## Verification

The CLI integration test checks the compact shape, stable control ID, affected-file list, constraints, verification handoff, and checkout-specific control selection.
