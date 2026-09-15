# ProductionOS

ProductionOS is the production-engineering layer for AI coding agents.

Your coding agent can write a feature. ProductionOS asks what that feature needs to survive real users, maps those needs to the repository, and keeps the proof separate from the claim.

```text
intent -> discovery -> capabilities -> requirements -> verification -> evidence -> gate
```

## What works today

The current pre-release engine supports a TypeScript/Next.js-centered workflow with:

- versioned `.productionos/manifest.yaml` and durable local state;
- deterministic package, route, environment, configuration, middleware/operational-integration, and TypeScript AST discovery;
- capability and requirement graphs;
- an initial catalog of security, authorization, database, reliability, cost, AI, observability, operations, and supply-chain controls;
- static verification, explicit local test execution, evidence fingerprints, stale evidence detection, waivers, and profile-aware gates;
- explicitly authorized loopback load measurement with measured latency, throughput, and error reporting;
- conservative `simplify` advice that never mutates or certifies dependency removal;
- capability-triggered `slo` objectives that keep configured targets separate from runtime proof;
- compact JSON context for coding agents;
- reproducible flawed SaaS and agentic fixtures, deterministic tests, and a benchmark runner.

It is intentionally local-first. It does not upload repositories, deploy applications, or claim compliance certification.

## Quick start from a clone

```bash
npm install
npm test
npm run build
npm run demo

node dist/apps/cli/src/main.js init --root path/to/your-app
node dist/apps/cli/src/main.js inspect --root path/to/your-app
node dist/apps/cli/src/main.js audit --root path/to/your-app
node dist/apps/cli/src/main.js verify --root path/to/your-app --run-tests
node dist/apps/cli/src/main.js gate --root path/to/your-app
```

The repository is the source distribution for the CLI. A published npm package will expose the same interface as `npx productionos` when a package release is made.

## Try the measured fixture

```bash
npm run benchmark
```

The intentionally flawed target is [`fixtures/nextjs-saas`](fixtures/nextjs-saas). Its blocked gate is generated from actual findings and evidence; it is not sample output embedded in the documentation.

## Evidence, not scores

ProductionOS uses statuses such as `INFERRED`, `STATICALLY_VERIFIED`, `TEST_VERIFIED`, `FAILED`, `WAIVED`, and `STALE`. A natural-language agent assertion is never evidence. A control's evidence records the command, working directory, exit status, affected-file hints, input fingerprint, output summary, and limitations.

## Architecture

The executable engine lives in a strict TypeScript monorepo. The CLI orchestrates independent packages for manifest, state, discovery, graphs, policy, verification, evidence, and reporting. The portable agent interface is [`skills/productionos/SKILL.md`](skills/productionos/SKILL.md).

Read [`docs/PRODUCT.md`](docs/PRODUCT.md), [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md), [`docs/CONTROL_MODEL.md`](docs/CONTROL_MODEL.md), and [`docs/DEVELOPMENT_STATE.md`](docs/DEVELOPMENT_STATE.md) before contributing.

## Status

This repository is the v0.1 public release. Hosted features, broad framework coverage, automated remediation, and attack/chaos modes remain outside the initial release boundary; `load` is limited to explicit loopback measurement and `simplify` is advisory only.

## License

ProductionOS is released under the [Apache License 2.0](LICENSE).
