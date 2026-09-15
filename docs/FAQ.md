# FAQ

## Is this a security scanner?

It can host deterministic security checks, but its product boundary is broader: application discovery, capability-triggered production requirements, verification evidence, and release gating.

## Does a passing audit mean the application is safe?

No. Audit findings are not proof. `verify` records the limited checks that actually ran, and each evidence record states its limitations.

## Does it require an LLM?

No. The initial workflow is deterministic and local. LLMs may assist future explanation or remediation planning but cannot create evidence.

## Why is the gate blocked?

Inspect the blocking control, run its documented verification, or create an explicit repository waiver with a reason, owner, and optional expiry. A waiver remains visible.

Waivers must name a known ProductionOS control. Unknown control IDs are rejected instead of creating an inert or misleading waiver record.
