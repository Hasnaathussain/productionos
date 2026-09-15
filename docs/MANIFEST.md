# Production Manifest v1

The manifest is a user-owned input layered over deterministic discovery. Discovery fills fields it can prove; user values remain authoritative for information that cannot be inferred.

```yaml
version: 1

project:
  type: nextjs_application
  maturity: prototype

runtime:
  language: typescript
  framework: nextjs
  deployment: vercel

database:
  provider: postgres
  orm: prisma

auth:
  enabled: true
  provider: authjs

payments:
  enabled: true
  provider: stripe

uploads:
  enabled: true
  storage: s3

ai:
  enabled: true
  provider: openai

data:
  pii:
    - email

scale:
  expected_users: 10000

reliability:
  availability_target: 99.9
```

## Rules

- `version` must be `1`.
- `project.maturity` must be `prototype`, `public`, `saas`, `business_critical`, or `regulated`.
- `scale.expected_users`, when present, must be a non-negative integer.
- `reliability.availability_target`, when present, must be greater than `0` and at most `100`; it is an objective, not runtime proof.
- Nested provider/framework/deployment/language fields must be strings, feature `enabled` fields must be booleans, and `data.pii` must be a string array.
- `init` creates a minimal valid manifest and never overwrites it without `--force`.
- `inspect` updates only fields supported by deterministic repository evidence; it can infer framework, deployment, and recognized provider names when those fields are not already configured.
- Explicit runtime, database, payment, AI, and upload provider values remain authoritative during inspection.
- Unknown fields are rejected by the v1 validator so accidental typos cannot silently change policy.
- Secrets and secret values never belong in the manifest.
