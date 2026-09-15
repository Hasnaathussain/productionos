# Examples

The first reproducible demo target is `../fixtures/nextjs-saas`, an intentionally flawed Next.js/Prisma/Stripe/OpenAI repository. It is used by the discovery tests and ProductionBench so its output is measured rather than written as illustrative prose.

From the ProductionOS root:

```bash
npm run demo
```

The single demo command copies the fixture to a temporary directory, runs the full inspect/audit/verify/evidence/gate workflow, and reports the actual blocking controls. The expected gate result is `BLOCKED`; exit code `2` is handled by the demo runner because that is the evidence-backed result for the intentionally flawed target.

For individual commands:

```bash
npm run build
node dist/apps/cli/src/main.js init --root fixtures/nextjs-saas
node dist/apps/cli/src/main.js inspect --root fixtures/nextjs-saas
node dist/apps/cli/src/main.js audit --root fixtures/nextjs-saas
node dist/apps/cli/src/main.js verify --root fixtures/nextjs-saas --run-tests
node dist/apps/cli/src/main.js gate --root fixtures/nextjs-saas
```

The expected result is a blocked gate with evidence-backed findings. The repository does not claim that the fixture is safe or launchable.
