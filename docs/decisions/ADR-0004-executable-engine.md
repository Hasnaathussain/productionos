# ADR-0004: ProductionOS is an executable engine, not a prompt collection

- **Status:** Accepted
- **Date:** 2026-09-14

## Context

The master specification explicitly rejects a giant prompt file. AI instructions can guide an agent, but they cannot independently prove that a repository control works, persist evidence, invalidate it after relevant changes, or apply a profile-aware production gate.

## Decision

Build a deterministic local CLI/core as the product. The agent skill is a thin progressive-context interface over discovery, graph, policy, verification, evidence, and gate commands. LLMs may assist classification and explanation later, but their claims are never evidence.

## Alternatives considered

- Prompt-only skill: low implementation cost, but no independent verification or durable control state.
- Hosted dashboard first: creates credentials, privacy, deployment, and availability complexity before the local engine is trustworthy.
- External scanner wrapper: useful adapters, but insufficient application intent, capability, remediation, and gate lifecycle.

## Consequences

- The repository needs versioned data contracts and deterministic tests.
- The first release is larger than a prompt file but remains local-first and dependency-light.
- The skill can evolve independently from the core engine and remain portable across agent ecosystems.
