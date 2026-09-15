# ADR-0009: Trigger agent permission controls only from explicit tool operations

- **Status:** Accepted
- **Date:** 2026-09-14

## Context

Agentic applications can turn model output into filesystem, database, communication, infrastructure, or financial actions. Treating every ordinary model call as a privileged agent would create false positives, while ignoring explicit tool operations would miss a high-impact boundary.

## Decision

Discovery emits an `agent_operations` signal only for explicit tool/function/agent operation patterns. The capability graph activates `agentic_operations`, and `AI-TOOL-001` requires a separate observable permission-boundary signal such as an allowlist, tool authorization, argument validation, or least-privilege policy. Dangerous-operation signals are retained as supporting evidence but do not independently activate the control.

## Verification

The ordinary SaaS and minimal fixtures remain non-agentic. A dedicated flawed agentic fixture activates `AI-TOOL-001`, fails without a permission boundary, and participates in the benchmark false-positive contract.
