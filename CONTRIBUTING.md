# Contributing

ProductionOS values small, evidence-backed changes.

## Development

```bash
npm install
npm run typecheck
npm test
npm run benchmark
```

Before a significant change, record why it is needed, the smallest justified design, alternatives, new complexity, and deterministic verification. Update the relevant ADR and `docs/DEVELOPMENT_STATE.md` at milestone boundaries.

## Controls and adapters

Controls must have stable IDs, triggers, rationale, recommendations, affected-file hints, verification methods, limitations, and regression fixtures. Adapters must not execute arbitrary target code implicitly or turn an LLM assertion into evidence.

## Pull requests

Include scope, why, tests, limitations, and evidence. Do not weaken or remove tests to obtain a passing result. Keep unrelated changes out of the pull request.
