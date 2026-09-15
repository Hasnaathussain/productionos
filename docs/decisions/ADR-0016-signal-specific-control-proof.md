# ADR-0016: Do not use adjacent signals as proof for distinct controls

- **Status:** Accepted
- **Date:** 2026-09-14

## Context

A source pattern can be related to a risk without proving the specific control. Structured logging does not prove redaction, input validation does not prove outbound-target validation, and a token cap does not prove an AI spend quota. Accepting those neighboring signals creates false positives that are especially harmful when the gate consumes the result.

## Decision

Use control-specific discovery signals for sensitive-log redaction, bounded queries, AI quota/concurrency, AI payload bounds, and outbound-target validation. Related signals may remain supporting evidence in explanations, but they do not independently promote the control.

## Verification

The safe upload fixture carries explicit query and target-boundary signals and remains non-failing in the benchmark. Existing flawed fixtures continue to expose unresolved controls; the policy test asserts the positive upload boundaries directly.
