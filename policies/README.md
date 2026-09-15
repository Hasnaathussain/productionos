# ProductionOS control policy boundary

The executable control catalog currently lives in `packages/policy/src/index.ts` so deterministic evaluators can be type-checked and unit-tested. This directory documents the stable policy boundary and is the home for declarative policy packs as they become independently versioned.

Every control must expose an id, version, title, domain, severity, capability trigger, verification methods, evidence requirements, rationale, failure modes, tradeoffs, recommendation, affected-file hints, limitations, and false-positive boundary. The executable catalog derives the evidence artifact and description from each declared verification method so the requirement graph remains machine-readable without duplicating evaluator logic.

Controls must not execute arbitrary code implicitly. Executable adapters require an explicit trust boundary and tests.
