# How it works

1. Discovery reads bounded repository files, package metadata, routes, environment names, deployment configuration, provider and operational-integration dependencies, middleware paths, and TypeScript syntax facts without importing target code.
2. The capability graph normalizes observations such as payments, webhooks, AI generation, uploads, tenancy, and database access.
3. The requirement graph activates only controls relevant to those capabilities, records dependencies between controls, and carries each control's expected evidence artifacts, limitations, and false-positive boundary.
4. Audit produces findings and explanations, but does not pretend to verify behavior.
5. Verification runs deterministic static checks and optionally an explicitly requested local test command.
6. Evidence stores provenance and affected-file fingerprints. Relevant changes make evidence stale.
7. Gate applies the manifest maturity profile and visible waivers to decide `PASS` or `BLOCKED`.
