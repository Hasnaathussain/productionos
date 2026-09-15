# Writing controls

Start with the failure the control prevents. Give it a stable ID, version, domain, severity, capability trigger, rationale, recommendation, affected-file hints, verification methods, and an evaluator that returns pass, fail, or unknown.

The evaluator must be conservative. A source pattern usually supports `INFERRED` until `verify` records the static evidence. It must not claim runtime behavior it cannot observe. Add a fixture for both a relevant finding and an unrelated repository where the control must remain `NOT_APPLICABLE`.
