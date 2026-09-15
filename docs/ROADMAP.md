# ProductionOS Implementation Roadmap

This roadmap turns the master build directive into executable milestones. Each milestone has a contract, deterministic verification, and a state update before the next milestone begins.

| Phase | Deliverable | Evidence of completion |
| --- | --- | --- |
| 0 | Product, MVP, architecture, control model, research, ADRs | Reviewed durable docs and ADRs |
| 1 | Strict TypeScript monorepo, CLI, manifest, state, logging, errors, tests, CI | Install/run/validate/test commands pass |
| 2 | Next.js-focused repository discovery | Fixture discovery assertions pass |
| 3 | Capability and requirement graphs | Deterministic graph snapshots/fixtures pass |
| 4 | Initial 25–40 controls | Trigger and false-positive tests pass |
| 5 | Static/test verification and evidence | Evidence provenance and no-self-certification tests pass |
| 6 | Targeted evidence invalidation | Affected evidence stales; unrelated evidence survives |
| 7 | Profile-aware gate and waivers | CI exit behavior and waiver tests pass |
| 8 | Progressive agent skill | Skill references real CLI/context commands |
| 9 | Low-risk remediation | Preconditions, tests, verification, and rollback are enforced |
| 10 | ProductionBench | Measured detection, false-positive, remediation, verification, invalidation, and regression report |
| 11 | Reproducible flawed demo | Demo commands execute and output is evidence-backed |
| 12 | OSS/docs polish | README, guides, security, privacy, contribution, CI/release docs |
| 13 | v0.1 release candidate | Clean install, tests, CI, real controls, evidence, demo, benchmark |

## Per-subsystem decision record

Before each major subsystem, record why it is needed, its contract, test strategy, success measure, alternatives, and new complexity. The first foundation decision is ADR-0005.
