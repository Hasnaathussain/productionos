# Getting started

ProductionOS currently runs from a source checkout with Node.js 20 or newer.

```bash
npm install
npm test
npm run build
node dist/apps/cli/src/main.js --version
```

After building the benchmark and demo, `npm run release:check` performs a deterministic local release audit. It fails on missing artifacts, an invalid compiled policy surface, an out-of-range control catalog, or unhealthy benchmark results; licensing and remote workflow execution are reported as human-gated advisories.

Run the CLI against a local target with `--root`. `init` creates `.productionos/`; `inspect` reads the target without executing its application; `audit` evaluates relevant controls; `verify` creates evidence; `gate` applies the manifest profile.

Use `--json` for agent/CI integration and `--verbose` for explanations. `--run-tests` is explicit because it executes the target repository's local test command.

To associate a passing test run with a specific control, include the stable control ID in the test filename, for example `tests/SEC-AUTHZ-001.test.ts`. ProductionOS will record control-specific `TEST_VERIFIED` evidence only for that explicit convention; a project-wide passing test never proves every control. The verifier uses the detected `npm`, `pnpm`, `yarn`, or `bun` package manager, with a fixed `npm` fallback when no recognized manager is declared.

For a local capacity measurement, first start the target yourself, then run `prodos load --url http://127.0.0.1:3000/health --allow-local`. The command is bounded and loopback-only; it reports measured latency, throughput, and errors while leaving saturation and production capacity as unknown.

Run `prodos simplify` to review possible dependency or infrastructure over-complexity. It produces advisory candidates under `.productionos/reports/simplify.json` and never removes anything automatically.

Run `prodos slo` to generate capability-triggered service objectives, including an unspecified API p95-latency objective when public routes are detected. Configured targets remain explicitly unverified until an authorized runtime measurement exists.

For a compact agent-facing explanation, run `prodos explain SEC-AUTHZ-001 --agent --json`; it returns the control rationale, failure modes, tradeoffs, evidence requirements, affected-file hints, constraints, and the next verification command without the full human report.

Use `prodos context --task "fix checkout" --json` to select controls from the task wording. Matching is deterministic and expands a small vocabulary for checkout, login, upload, invitation, and AI work.
