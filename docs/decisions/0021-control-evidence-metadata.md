# ADR-0021: Keep evidence metadata in the versioned control contract

## Status

Accepted

## Context

The control model requires more than a title and a verification method. Agents and reviewers need to know what artifact can prove a control, what the check cannot establish, and where a source signal can produce a false positive. Previously, the executable catalog carried some of this information only in evaluator behavior and evidence-record limitations, so the requirement graph was incomplete as an agent-facing contract.

## Decision

Each requirement exposes evidence requirements, limitations, and a false-positive boundary. Evidence requirements map the declared verification method to a stable artifact kind: source reference, test result, or authorized runtime observation. The evaluator remains executable TypeScript; the metadata is derived at catalog construction so policy logic is not duplicated in a declarative file.

The requirement graph schema advances to version 2 and the policy catalog advances to version 1.1.0. Existing evidence created against policy version 1.0.0 is therefore stale by design.

## Consequences

- Agent context and requirement artifacts can explain what proof is expected before implementation begins.
- A source match still cannot self-certify a control; the metadata makes that boundary explicit.
- Consumers of persisted requirement graphs must accept schema version 2, and old evidence must be re-created after inspection and verification.
- Future declarative policy packs can validate the same metadata shape through `policies/control.schema.json` without executing arbitrary code.
