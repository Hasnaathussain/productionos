# ProductionBench

`npm run benchmark` copies each fixture to a temporary directory, initializes it, runs deterministic inspection and audit, compares findings with the case contract, exercises configured remediation and test-verification contracts, deliberately introduces a configured regression, and writes `benchmarks/results.json`.

The current cases measure detection, false positives, one low-risk remediation, one control-specific test verification, evidence invalidation, and one deliberate regression. They include flawed SaaS, minimal, agentic, upload, migration-safety, and external-API fixtures. Runtime probes, attack/chaos behavior, external load testing, and broader remediation remain outside the current benchmark. Results are measured output from the current code, not a general accuracy claim.
