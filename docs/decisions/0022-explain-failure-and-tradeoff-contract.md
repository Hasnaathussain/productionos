# ADR-0022: Make control failure modes and tradeoffs explicit

## Status

Accepted

## Context

The master specification requires `prodos explain <CONTROL>` to state what is wrong, why it matters, how the control can fail, how ProductionOS proposes to fix it, the tradeoffs, and the verification method. The existing control contract carried rationale, recommendation, and verification metadata but made failure modes and tradeoffs implicit in prose. That left human and agent consumers to infer important safety context.

## Decision

Add `failureModes` and `tradeoffs` arrays to every machine-readable requirement. The policy catalog derives honest baseline descriptions from each control's title and rationale, with an optional override path for future controls that need more specific scenarios. The CLI exposes both fields in full and compact agent explanations, and the control schema and requirement graph versions advance accordingly.

The requirement graph advances to schema version 3 and the policy catalog advances to version 1.2.0. Existing evidence created against policy version 1.1.0 becomes stale by design.

## Consequences

- Agents and reviewers can inspect failure scenarios and operational cost before changing a control boundary.
- Explanations remain deterministic metadata views; they are not verification evidence.
- A new control must provide non-empty failure-mode and tradeoff descriptions, even when the baseline helper is used.
- Consumers of persisted requirement graphs must accept schema version 3, and old evidence must be recreated after inspection and verification.
