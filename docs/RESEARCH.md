# Phase 0 Research Notes

Research was limited to the architecture decision needed to start the local engine. It is not a claim that ProductionOS replaces any of these projects.

## Adjacent tools

- [Semgrep](https://github.com/semgrep/semgrep) is an open-source static-analysis engine with code-shaped rules and optional CI/editor integrations. ProductionOS should consume or complement such engines through optional adapters, while owning application capabilities, production requirements, evidence, and gates.
- [CodeQL](https://codeql.github.com/docs/codeql-overview/about-codeql/) provides semantic code and data-flow analysis. Its query/database model is powerful but is not a substitute for a repository-local application model or profile-aware production gate.
- [OpenSSF Scorecard](https://openssf.org/scorecard/) evaluates open-source repository security practices. ProductionOS should use objective checks where helpful but must not reduce application production readiness to a single repository score.
- [NVIDIA Agent Skills](https://github.com/NVIDIA/skills) and [production-grade agent skills](https://github.com/addyosmani/agent-skills) demonstrate that portable skill directories are useful interfaces for agents. ProductionOS will keep its skill thin and make the executable CLI/core the source of truth.

## Resulting decisions

1. Deterministic repository inspection and policy evaluation are core product behavior.
2. External scanners are optional adapters with explicit availability and privacy behavior.
3. Capability-triggered requirements and evidence invalidation are the product's differentiator.
4. No hosted backend or LLM dependency is needed for the initial local workflow.
