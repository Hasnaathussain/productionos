# ProductionBench report

This report is a measured snapshot of the checked-in benchmark cases. It is intentionally narrow and must not be read as a general accuracy claim.

**Generated:** 2026-09-14 (Asia/Karachi)
**Command:** `npm run benchmark`
**Scope:** deterministic discovery, inspection, audit, one remediation contract, one test-verification contract, evidence invalidation, and one deliberate regression

| Case | Expected findings | Detected | Missed | False positives | Remediation | Test verification | Regression |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| `broken-nextjs-saas` | 4 | 4 | 0 | 0 | 1/1 | 1/1 | 1/1 |
| `minimal-nextjs` | 0 | 0 | 0 | 0 | 0/0 | 0/0 | 0/0 |
| `agentic-next` | 1 | 1 | 0 | 0 | 0/0 | 0/0 | 0/0 |
| `upload-safe` | 0 | 0 | 0 | 0 | 0/0 | 0/0 | 0/0 |
| `migration-unsafe` | 1 | 1 | 0 | 0 | 0/0 | 0/0 | 0/0 |
| `external-api-unsafe` | 3 | 3 | 0 | 0 | 0/0 | 0/0 | 0/0 |
| **Total** | **9** | **9** | **0** | **0** | **1/1** | **1/1** | **1/1** |

The flawed SaaS fixture exercises missing authorization, webhook authenticity, AI input boundaries, payment validation, a security-header remediation, control-specific test evidence, and stale-evidence detection after a deliberate header regression. The minimal fixture checks that unrelated controls are not activated merely because a repository uses Next.js. The agentic fixture checks that explicit tool operations activate the permission-boundary control while ordinary model calls do not. The upload-safe fixture checks positive file-upload/object-storage activation and that bounded validation and authorization signals do not become failures. The migration-unsafe fixture checks that a recognized non-null migration is surfaced as a failed staged-review control. The external-api-unsafe fixture checks missing timeout, retry, and outbound-target controls for a public provider call.

Runtime verification, attack mode, chaos testing, external load testing, and broader remediation are not represented in this report. Bounded loopback load measurement is available through `prodos load`, but is intentionally not mixed into fixture-audit metrics. The machine-readable output is regenerated at `benchmarks/results.json`.
