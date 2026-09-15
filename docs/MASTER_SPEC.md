# MASTER BUILD DIRECTIVE — PRODUCTIONOS

You are the principal engineer, product architect, security engineer, SRE, DevEx engineer, technical writer, QA engineer, and open-source maintainer responsible for building **ProductionOS** from an empty repository into a polished, tested, documented, publicly usable open-source project.

This is not a prototype, hackathon project, demo, fake scanner, prompt collection, or “vibe-coded” repository.

Build it as if it will be:

* installed by real developers,
* run against real repositories,
* scrutinized by experienced engineers,
* featured publicly on GitHub,
* evaluated by employers and open-source maintainers,
* integrated into AI coding agents,
* and potentially developed into a commercial developer-tools company.

The final repository must demonstrate serious software-engineering ability.

---

# 1. PRODUCT VISION

ProductionOS is:

> **The production-engineering layer for AI coding agents.**

AI coding tools are very good at producing working applications, but users often don't know what they failed to ask for.

Examples include:

* authentication correctness,
* authorization,
* tenant isolation,
* rate limiting,
* API abuse protection,
* secure file uploads,
* secrets management,
* database indexes,
* safe migrations,
* retries,
* timeouts,
* idempotency,
* caching,
* CDN usage,
* logging,
* monitoring,
* tracing,
* backups,
* restore testing,
* cost limits,
* LLM quotas,
* security headers,
* webhook verification,
* race-condition protection,
* dependency vulnerabilities,
* load testing,
* CI/CD,
* rollback plans,
* health checks,
* operational readiness.

A nonexpert should be able to say:

> “Build me a SaaS where users upload documents and chat with them.”

Their coding agent can build the application.

ProductionOS should make the agent understand:

> “If this is intended for real users, these additional engineering controls are required, these are the reasons, this is how they should be implemented, and this is how we prove they actually work.”

ProductionOS must therefore operate on the lifecycle:

```text
USER INTENT
     ↓
REPOSITORY DISCOVERY
     ↓
APPLICATION MODEL
     ↓
CAPABILITY GRAPH
     ↓
RISK / FAILURE GRAPH
     ↓
REQUIREMENTS
     ↓
REMEDIATION PLAN
     ↓
IMPLEMENTATION
     ↓
INDEPENDENT VERIFICATION
     ↓
EVIDENCE
     ↓
PRODUCTION GATE
     ↓
CONTINUOUS DRIFT DETECTION
```

---

# 2. CENTRAL PRODUCT PRINCIPLE

Never confuse:

```text
“code appears to contain a feature”
```

with:

```text
“the feature has been verified to work”
```

ProductionOS must be evidence-driven.

Do not produce meaningless claims such as:

```text
Security: 98%
Production readiness: 96%
Everything looks secure.
```

Instead use statuses such as:

```text
UNASSESSED
INFERRED
STATICALLY_VERIFIED
TEST_VERIFIED
RUNTIME_VERIFIED
WAIVED
FAILED
NOT_APPLICABLE
```

A control marked as verified must have reproducible evidence.

---

# 3. VERY IMPORTANT: DO NOT BUILD A GIANT PROMPT FILE

ProductionOS is not merely:

```text
SKILL.md
security.md
performance.md
production.md
```

The skill is only the interface between an AI coding agent and the underlying system.

The real product must contain a deterministic executable engine.

High-level architecture:

```text
Coding Agent
     │
ProductionOS Skill
     │
ProductionOS CLI/Core
     │
 ┌───┼──────────────────────┐
 │   │                      │
Discovery                Policy Engine
 │                          │
Application Model       Requirement Graph
 │                          │
 └────────────┬─────────────┘
              │
       Remediation Engine
              │
        Verification Engine
              │
        Evidence System
              │
       Production Gate
```

The LLM may assist with classification, explanation and remediation.

Deterministic code and tools should handle verification whenever possible.

---

# 4. INITIAL SUPPORTED STACK

Do not attempt to support every technology.

The first high-quality supported ecosystem should focus on modern AI/SaaS applications.

Initial target:

```text
Language:
TypeScript

Frontend/backend:
Next.js App Router

Database:
PostgreSQL

ORM/data:
Prisma
Supabase where appropriate

Authentication:
Auth.js
Supabase Auth
generic Next.js auth patterns

Payments:
Stripe

AI:
OpenAI-compatible APIs

Storage:
S3-compatible storage
Supabase Storage

Deployment:
Vercel

Testing:
Vitest
Playwright

CI:
GitHub Actions
```

Architect everything so additional adapters can later support:

```text
FastAPI
Express
NestJS
Rails
Laravel
Firebase
Clerk
AWS
Cloudflare
Docker
Kubernetes
Anthropic
queues/workers
etc.
```

But do NOT prematurely implement all of them.

Depth > breadth.

---

# 5. REPOSITORY STRUCTURE

Start from something approximately like:

```text
productionos/
│
├── apps/
│   ├── cli/
│   └── dashboard/                # optional after core CLI works
│
├── packages/
│   ├── core/
│   ├── discovery/
│   ├── manifest/
│   ├── graph/
│   ├── policy/
│   ├── evidence/
│   ├── verifier/
│   ├── remediation/
│   ├── reporting/
│   ├── state/
│   └── sdk/
│
├── adapters/
│   ├── frameworks/
│   │   └── nextjs/
│   ├── databases/
│   │   ├── postgres/
│   │   ├── prisma/
│   │   └── supabase/
│   ├── auth/
│   ├── payments/
│   ├── storage/
│   ├── deployment/
│   └── ai/
│
├── policies/
│   ├── security/
│   ├── authorization/
│   ├── database/
│   ├── reliability/
│   ├── performance/
│   ├── observability/
│   ├── cost/
│   ├── supply-chain/
│   └── ai/
│
├── skills/
│   ├── productionos/
│   ├── productionize/
│   ├── production-audit/
│   └── launch-check/
│
├── benchmarks/
│
├── fixtures/
│
├── examples/
│
├── docs/
│
└── .github/
```

This is a guideline, not a rigid requirement.

Improve it when justified.

---

# 6. TOKEN EFFICIENCY IS A FIRST-CLASS FEATURE

ProductionOS itself and the development process used to build it must be designed for efficient AI-agent operation.

Do not repeatedly load entire repositories into model context.

Build mechanisms for selective retrieval.

ProductionOS should provide concise machine-readable state so an agent can recover after context compression or a completely new session.

Create persistent project state such as:

```text
.productionos/
├── manifest.yaml
├── capabilities.json
├── requirements.json
├── graph.json
├── state.json
├── evidence/
├── decisions/
├── waivers/
└── reports/
```

An agent should be able to run:

```bash
prodos status
```

and obtain a compact summary containing:

```text
project profile
detected stack
current milestone
unresolved controls
failed controls
recent architecture decisions
changed files affecting evidence
next recommended work
```

Do not depend on conversational memory.

The repository must be the source of truth.

---

# 7. CONTEXT COMPRESSION RESILIENCE

Assume the coding agent will periodically lose most of its context.

Design development and ProductionOS around that assumption.

Maintain:

```text
docs/ARCHITECTURE.md
docs/PRODUCT.md
docs/CONTROL-MODEL.md
docs/DEVELOPMENT-STATE.md
docs/DECISIONS/
```

The development-state file must remain concise.

After significant work, update:

```text
what changed
why it changed
current architecture
known limitations
unresolved work
next milestone
```

Do not dump chat transcripts into documentation.

Persist decisions, not conversation.

---

# 8. THE “WHY BEFORE CODE” RULE

Before implementing a significant feature or architectural change, determine:

```text
WHY is this needed?

WHAT problem does it solve?

WHAT evidence shows that problem exists?

WHAT is the smallest appropriate implementation?

WHAT are the alternatives?

WHAT new complexity does the change introduce?

HOW will correctness be verified?
```

Do not write code merely because:

```text
“production systems usually use X”
```

Example:

Do not add Redis because Redis is considered “production-grade.”

First determine whether the application actually requires distributed state, shared rate limiting, caching or another Redis use case.

The same applies to:

```text
Kafka
Kubernetes
microservices
event buses
queues
service meshes
distributed databases
multiple caches
complex infrastructure
```

ProductionOS must actively resist unjustified architecture.

---

# 9. WHEN TO ASK THE HUMAN

Do NOT interrupt me for questions you can resolve safely from:

```text
repository evidence
existing architecture
industry-standard defaults
current project documentation
tests
configuration
```

Ask me only when the answer materially changes product behavior or architecture and cannot reasonably be inferred.

Examples:

```text
Does this application process regulated medical data?

What downtime can the business tolerate?

Is this intended for a prototype or paying customers?

Should this destructive migration affect production data?

May this agent perform a production deployment?
```

Do NOT ask questions such as:

```text
Should I use Zod for schema validation?

Should this helper function live in /lib or /utils?

Should I add another unit test?
```

Make reasonable engineering decisions independently.

---

# 10. PRODUCTION PROFILES

Implement maturity profiles.

At minimum:

```text
prototype
public
saas
business_critical
regulated
```

Requirements must vary by profile.

A portfolio website should not be forced to deploy Kubernetes, multi-region PostgreSQL and distributed tracing.

Likewise, a revenue-generating multi-tenant SaaS should not be treated like a hobby project.

ProductionOS should consider:

```text
expected users
traffic
payments
business criticality
data sensitivity
external dependencies
availability requirements
recovery requirements
budget
AI usage
multi-tenancy
uploads
public APIs
background processing
```

---

# 11. PRODUCTION MANIFEST

Create a versioned schema such as:

```text
.productionos/manifest.yaml
```

Example:

```yaml
version: 1

project:
  type: multi_tenant_saas
  maturity: saas

runtime:
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
    - name

scale:
  expected_users: 10000

reliability:
  availability_target: 99.9
```

Repository discovery should generate most of this automatically.

Users should only supply information that cannot reasonably be inferred.

---

# 12. APPLICATION DISCOVERY ENGINE

Build deterministic repository discovery.

It should detect, where possible:

```text
language
framework
package manager
routes
API endpoints
server actions
database
ORM
authentication
authorization patterns
payments
storage
AI providers
queues
cron jobs
email providers
external APIs
environment variables
deployment configuration
middleware
logging
tests
CI
containers
```

Return structured data.

Do not rely exclusively on regex.

Use AST parsing where justified.

Keep adapters modular.

Write fixtures and tests for detection behavior.

---

# 13. CAPABILITY GRAPH

Normalize discovery output into capabilities.

Examples:

```text
user_authentication
password_reset
multi_tenancy
payments
subscriptions
file_uploads
llm_generation
webhooks
admin_panel
background_jobs
email_delivery
public_api
object_storage
```

Capabilities should activate relevant production requirements.

Example:

```text
payments
    ↓
webhooks
    ↓
signature verification
idempotency
replay protection
server-side amount validation
audit trail
failure recovery
```

---

# 14. PRODUCTION REQUIREMENT GRAPH

This is one of the most important parts of the project.

Represent dependencies between:

```text
capability
threat/failure
requirement
implementation
verification
evidence
```

Each requirement must be machine-readable.

Example structure:

```yaml
id: API-RATE-001

title: Protect expensive AI endpoint

domain: cost

severity: high

trigger:
  capabilities:
    - llm_generation
  conditions:
    public_endpoint: true

requirements:
  - per_user_limit
  - concurrency_limit
  - spending_guard

verification:
  - static
  - integration
  - runtime

evidence:
  - source_reference
  - test_result

remediation:
  strategy: framework_adapter
```

Design a clean versioned control DSL.

Do not overcomplicate it initially.

---

# 15. INITIAL POLICY DOMAINS

The MVP should include strong controls for:

## Security

```text
authentication
authorization
tenant isolation
sessions
secret handling
security headers
CSRF
CORS
XSS
injection
SSRF
IDOR
admin routes
file uploads
webhooks
rate limiting
abuse protection
sensitive logging
dependency security
```

## Database

```text
unsafe migrations
missing indexes
N+1 patterns where detectable
unbounded queries
pagination
constraints
transactions
tenant filtering
connection management
backup awareness
```

## Reliability

```text
timeouts
retries
exponential backoff
retry amplification
idempotency
graceful failure
health endpoints
background job retry
third-party failures
partial failures
```

## Performance

```text
slow endpoints
large bundles
image optimization
database hotspots
cache opportunities
CDN opportunities
load behavior
```

## Cost

```text
LLM usage
expensive endpoints
per-user quotas
email abuse
storage abuse
third-party request abuse
unbounded processing
```

## Observability

```text
structured logging
request IDs
error reporting
metrics
traces
critical business events
sensitive-data redaction
```

## AI-specific engineering

```text
prompt injection boundaries
tool permissions
output validation
token budgets
agent loop limits
PII handling
model timeout
fallback strategy
evaluation
model/prompt versioning
```

---

# 16. USE EXISTING ENGINEERING STANDARDS

Do not invent every rule yourself.

Use recognized engineering/security frameworks as references where appropriate.

Potential foundations include:

```text
OWASP Top 10
OWASP ASVS
OWASP API Security Top 10
NIST SSDF
OpenSSF Scorecard
SLSA
OpenTelemetry conventions
Google SRE practices
```

Do not claim compliance certification.

ProductionOS may map controls to external standards, but:

```text
mapping != certification
```

---

# 17. DETERMINISTIC SECURITY/QUALITY TOOLS

Integrate established tools when they materially improve verification.

Candidates:

```text
Semgrep
Gitleaks
OSV-Scanner
Trivy
OpenSSF Scorecard
OWASP ZAP
Playwright
k6
Lighthouse
OpenTelemetry
```

External dependencies should be optional where possible.

Provide clean adapters.

Fail gracefully if a tool is unavailable.

---

# 18. REMEDIATION ENGINE

ProductionOS should eventually support:

```bash
prodos fix
```

But do not blindly rewrite repositories.

Every remediation should have:

```text
preconditions
risk classification
implementation strategy
tests
verification procedure
rollback guidance
```

Use AI agents to implement changes when appropriate.

ProductionOS itself should supply structured requirements and verification criteria.

The coding agent should receive:

```text
control
reason
affected files
relevant architecture
recommended pattern
constraints
verification requirements
```

It should make the smallest correct change.

---

# 19. NEVER LET THE BUILDER VERIFY ITSELF

Architect separate roles.

```text
Builder
   ↓
Code changes
   ↓
Verifier
```

The verifier should evaluate:

```text
requirements
diff
tests
runtime behavior
deterministic scanner results
```

Do not simply trust the builder saying:

```text
Done.
```

---

# 20. EVIDENCE SYSTEM

Implement a durable evidence store.

Example:

```text
.productionos/evidence/AUTH-003.json
```

Store information such as:

```text
control ID
control version
git commit
affected files
verification method
verification command
test result
timestamp
artifact hashes where useful
confidence level
```

Example report:

```text
RATE-001

Implementation:
src/lib/rate-limit.ts

Endpoint:
POST /api/generate

Verification:
integration test

Observed:
100 accepted
900 rejected
HTTP 429 returned
Retry-After header returned

Status:
TEST_VERIFIED
```

Evidence must become invalid if relevant code changes.

---

# 21. EVIDENCE INVALIDATION

Build a dependency model.

Example:

```text
src/api/checkout.ts changed
           ↓
PAY-003 evidence affected
AUTHZ-011 evidence affected
IDEM-002 evidence affected
```

Invalidate only relevant controls.

Do not rerun the entire system unnecessarily.

This improves CI speed and token efficiency.

---

# 22. PRODUCTION GATE

Implement:

```bash
prodos gate
```

Example output:

```text
Production Gate

CRITICAL      0
HIGH          1
MEDIUM        3
WAIVED        1
UNVERIFIED    2

Runtime verified:  12
Test verified:     31
Static verified:   18

BLOCKED

Reason:
PAY-004 Stripe webhook replay protection not verified.
```

Critical/high controls should be able to block release based on profile.

Allow explicit waivers.

Never silently bypass failures.

---

# 23. WAIVERS

Support intentional risk acceptance.

Example:

```yaml
control: OBS-004
reason: Early private beta
owner: project_owner
expires: 2026-12-01
```

Waivers must:

```text
have reasons
be visible
optionally expire
never masquerade as PASS
```

---

# 24. ARCHITECTURE DECISION RECORDS

ProductionOS and the coding agent must record important decisions.

Example:

```text
ADR-004
```

Contain:

```text
Context
Decision
Alternatives
Reason
Tradeoffs
Revisit conditions
```

This prevents future coding-agent sessions from undoing intentional architecture.

---

# 25. ARCHITECTURE DRIFT

Eventually implement detection of architectural violations.

Example:

Expected:

```text
Browser → API → Database
```

Observed:

```text
Browser → Database
```

Report:

```text
Architecture drift detected.

Potential impact:
authorization boundary bypass.
```

---

# 26. ANTI-OVERENGINEERING ENGINE

This is a major differentiator.

ProductionOS should sometimes recommend:

```text
DO NOTHING
```

Example:

```text
Kubernetes not recommended.

Current:
1 stateless service
managed database
low expected traffic
simple deployment

Additional orchestration would create operational complexity
without solving a demonstrated problem.
```

Track unnecessary dependencies.

Eventually add:

```bash
prodos simplify
```

to identify removable complexity.

---

# 27. AI COST SAFETY

Implement specialized controls for AI applications.

Detect expensive routes.

Consider:

```text
per-user quota
per-IP quota
concurrency cap
token cap
monthly user budget
system budget
provider timeout
provider retry policy
max agent steps
max tool calls
```

Explain economic denial-of-service risks.

---

# 28. AGENT PERMISSION AUDITOR

For agentic applications, inspect dangerous capabilities.

Examples:

```text
filesystem write
shell execution
database mutation
email send
external HTTP
cloud infrastructure
payment operations
calendar modifications
```

Classify:

```text
read only
write
privileged
destructive
financial
```

Recommend least privilege.

---

# 29. DATA INVARIANT TESTING

Do not optimize only for code coverage.

Generate tests around business invariants.

Examples:

```text
User A cannot access User B resources.

A refund cannot exceed captured payment.

A payment cannot become PAID without verified provider state.

An invitation token can only be consumed once.

A deleted tenant must not expose historical resources.
```

These are more valuable than superficial unit tests.

---

# 30. PROPERTY-BASED TESTING

Support property-based testing for suitable domains.

Examples:

```text
permissions
billing
validation
parsing
serialization
financial calculations
state machines
```

Possible tools:

```text
fast-check
Hypothesis later for Python
```

---

# 31. BREAK-MY-APP MODE

Implement eventually:

```bash
prodos attack
```

Only against explicitly authorized local/test/staging environments.

Test scenarios such as:

```text
cross-tenant access
invalid JWT
expired session
large payload
rapid requests
duplicate requests
webhook replay
unsafe upload
duplicate checkout
concurrent purchase
dependency timeout
cost exhaustion
```

Never perform unsafe testing against arbitrary third-party production systems.

Produce evidence-based reports.

---

# 32. CHAOS / FAILURE TESTING

Simulate failures safely in development/staging:

```text
database unavailable
Redis unavailable
Stripe timeout
AI provider timeout
object storage failure
worker crash
network latency
process restart
```

Validate graceful degradation where appropriate.

---

# 33. MIGRATION SAFETY

Implement database migration analysis.

Example:

Bad migration:

```sql
ALTER TABLE users
ADD COLUMN profile JSONB NOT NULL;
```

ProductionOS should understand that existing rows may fail.

Recommend safer staged migration:

```text
1. Add nullable column.
2. Deploy compatible application.
3. Backfill.
4. Verify.
5. Add NOT NULL constraint.
```

---

# 34. WEBHOOK PRODUCTION ENGINEERING

Create strong reusable webhook policies.

Check:

```text
signature verification
timestamp verification
replay protection
idempotency
duplicate events
event ordering
async processing
persistent event record
retries
failure visibility
```

---

# 35. FILE UPLOAD SAFETY

Check:

```text
maximum size
MIME verification
extension handling
authorization
filename handling
storage boundaries
signed URLs
malware strategy
quota
image/document processing safety
```

---

# 36. OBSERVABILITY

Use vendor-neutral instrumentation where possible.

Support OpenTelemetry.

ProductionOS should reason about:

```text
logs
metrics
traces
correlation IDs
request IDs
errors
database latency
third-party latency
payments
webhooks
AI calls
background jobs
```

Avoid leaking sensitive data.

---

# 37. SLO SUPPORT

For higher profiles, generate appropriate service objectives.

Examples:

```text
API availability
login success
checkout success
p95 latency
background job success
```

Do not invent unrealistic targets.

---

# 38. CAPACITY AND LOAD TESTING

Implement:

```bash
prodos load
```

Use k6 or an equivalent adapter.

Report:

```text
p50
p95
p99
throughput
error rate
saturation where observable
```

Do not fabricate capacity predictions.

When modeling scale, clearly distinguish:

```text
measured
estimated
unknown
```

---

# 39. COST MODEL

Create cost-aware analysis.

Potential resources:

```text
LLM APIs
image/video generation
email
database
object storage
bandwidth
serverless functions
Redis
vector databases
third-party APIs
```

Focus first on detecting unbounded spend paths rather than trying to perfectly estimate monthly infrastructure cost.

---

# 40. BACKUPS VS RESTORE

Do not mark backup readiness as complete because backups are enabled.

Track:

```text
backup configured
backup freshness
restore documented
restore tested
recovery objective
```

Example:

```text
Backup: PASS
Restore test: UNKNOWN
Disaster recovery: INCOMPLETE
```

---

# 41. CLI UX

Aim for excellent developer experience.

Commands may eventually include:

```bash
prodos init
prodos inspect
prodos status
prodos explain
prodos plan
prodos audit
prodos fix
prodos verify
prodos evidence
prodos gate
prodos attack
prodos load
prodos launch
prodos simplify
```

Commands should have:

```text
--json
--quiet
--verbose
--ci
```

where useful.

Outputs should be human-friendly but scriptable.

---

# 42. HERO COMMAND

Eventually create:

```bash
prodos launch
```

Output something like:

```text
Can I launch?

YES — WITH 2 ACCEPTED RISKS

Verified:
authentication
tenant isolation
payments
rate limiting
upload authorization
critical API paths
monitoring

Accepted:
restore drill deferred for private beta

Unknown:
regional failover behavior

Recommended next checkpoint:
100 active users
```

Avoid fake certainty.

---

# 43. EXPLAIN MODE

Target users may not understand production terminology.

Implement:

```bash
prodos explain <CONTROL>
```

Explain:

```text
what is wrong
why it matters
how it could fail
how ProductionOS proposes to fix it
tradeoffs
verification method
```

Write plainly.

---

# 44. CHANGE IMPACT ANALYSIS

When new code is introduced:

```text
Add team invitations.
```

ProductionOS should infer new concerns such as:

```text
email sending
invite token entropy
token expiry
one-time consumption
organization membership mutation
authorization
rate limiting
audit trail
```

Run only relevant controls.

---

# 45. CONTINUOUS MODE

Eventually support:

```bash
prodos watch
```

and CI/PR integration.

On a pull request:

```text
Changed capability:
Team invitations

New requirements:
✓ secure invitation token
✓ expiration
✓ one-time consumption
✓ RBAC validation
✗ invitation rate limit

Gate:
BLOCKED
```

---

# 46. BENCHMARK SUITE

Build your own benchmark.

Name idea:

```text
ProductionBench
```

Create intentionally broken applications/fixtures.

Examples:

```text
cross-tenant-access
missing-stripe-signature
stripe-replay
unbounded-ai-cost
unsafe-upload
breaking-migration
missing-index
secret-exposure
missing-timeout
retry-storm
duplicate-checkout
race-condition
sensitive-log
admin-route-bypass
```

Every release should measure:

```text
detected
missed
false-positive
remediation-success
verification-success
regression-introduced
```

This benchmark is central to project credibility.

---

# 47. TESTING STRATEGY

The ProductionOS repository itself must maintain strong quality.

Use:

```text
unit tests
integration tests
fixture-based tests
CLI tests
snapshot tests only where sensible
end-to-end tests
benchmark regression tests
```

Do not chase meaningless 100% coverage.

Focus on critical behavior.

Every bug fix should preferably include a regression test.

---

# 48. SECURITY OF PRODUCTIONOS ITSELF

ProductionOS will execute inside other repositories.

Treat this as a supply-chain-sensitive tool.

Requirements:

```text
minimal permissions
no unexpected telemetry
no source-code upload by default
explicit external network behavior
safe subprocess execution
escaped shell arguments
dependency auditing
signed releases when practical
release checksums
clear data-handling documentation
```

Prefer local-first operation.

---

# 49. PRIVACY

Source code should remain local by default.

If future cloud functionality sends data externally:

```text
explicitly disclose it
minimize transmitted data
support opt-out
never silently upload repositories
```

Trust is critical.

---

# 50. SKILL ARCHITECTURE

After the CLI/core works, create portable agent skills.

Primary skill:

```text
skills/productionos/
├── SKILL.md
├── references/
│   ├── workflow.md
│   ├── remediation.md
│   ├── verification.md
│   └── safety.md
└── scripts/
```

Keep SKILL.md concise.

Use progressive disclosure.

The agent should load detailed references only when required.

The skill should instruct agents approximately:

```text
1. Understand user intent.
2. Run ProductionOS discovery.
3. Read relevant unresolved controls.
4. Determine WHY each proposed change is needed.
5. Implement the smallest justified change.
6. Never self-certify.
7. Run ProductionOS verification.
8. Preserve evidence.
9. Respect architecture decisions.
10. Do not bypass gates without explicit user authorization.
```

Create adapters/instructions for major coding-agent ecosystems only after the base skill works.

---

# 51. TOKEN-EFFICIENT AGENT WORKFLOW

This must be implemented carefully.

When an AI coding agent interacts with ProductionOS:

Do NOT dump:

```text
every rule
every file
every previous report
every test
```

into context.

Instead expose commands such as:

```bash
prodos status --json
prodos controls --relevant
prodos explain RATE-001 --agent
prodos context --task "fix checkout"
```

These should produce compact, task-specific context.

Example:

```json
{
  "task": "fix checkout",
  "controls": [
    "PAY-001",
    "PAY-004",
    "IDEM-002"
  ],
  "files": [
    "src/api/checkout.ts",
    "src/api/webhook.ts"
  ],
  "constraints": [
    "Do not change Stripe provider",
    "Preserve existing API contract"
  ]
}
```

This is critical.

---

# 52. DEVELOPMENT TOKEN EFFICIENCY

During your own implementation of ProductionOS:

Do not repeatedly reread large files.

Use:

```text
targeted search
symbol-level navigation
git diff
test failure output
structured development state
```

Before modifying code:

```text
read only relevant code
understand surrounding contracts
identify dependencies
```

Do not use brute-force repository context unless necessary.

---

# 53. CODE QUALITY

The repository must look intentionally engineered.

Requirements:

```text
strict TypeScript
small cohesive modules
clear interfaces
minimal global state
no giant god classes
no meaningless abstractions
no unnecessary dependency wrappers
good error handling
typed errors where useful
deterministic behavior
stable schemas
versioned formats
```

Avoid code that looks generated.

Examples of poor patterns:

```text
1000-line service files
generic utils dumping ground
duplicated validation
needlessly verbose comments
comments describing obvious syntax
placeholder implementations
fake TODO completions
dead abstractions
```

---

# 54. COMMENTING STYLE

Comments should explain:

```text
why
invariants
non-obvious tradeoffs
dangerous behavior
compatibility constraints
```

Do not comment:

```text
// increment counter
counter++;
```

---

# 55. DOCUMENTATION

Create excellent documentation.

At minimum:

```text
README.md
docs/GETTING-STARTED.md
docs/ARCHITECTURE.md
docs/HOW-IT-WORKS.md
docs/CONTROL-MODEL.md
docs/WRITING-CONTROLS.md
docs/WRITING-ADAPTERS.md
docs/SECURITY.md
docs/PRIVACY.md
docs/CONTRIBUTING.md
docs/ROADMAP.md
docs/FAQ.md
CHANGELOG.md
SECURITY.md
CONTRIBUTING.md
CODE_OF_CONDUCT.md
LICENSE
```

README must be unusually good.

---

# 56. README STRUCTURE

The README should quickly communicate:

```text
problem
solution
demo
installation
30-second quick start
example findings
evidence concept
how ProductionOS differs from scanners
supported stacks
agent integrations
architecture
security model
benchmark
roadmap
contributing
```

Do not start with ten paragraphs of philosophy.

Show the value quickly.

---

# 57. DEMO PROJECT

Build an intentionally vibe-coded SaaS example.

It should contain realistic mistakes.

For example:

```text
missing tenant authorization
unsafe Stripe webhook
unbounded AI endpoint
unsafe upload
missing login rate limit
sensitive logs
bad migration
missing index
missing timeout
```

Show:

```text
BEFORE
```

then:

```bash
prodos inspect
prodos audit
prodos fix
prodos verify
prodos gate
```

then:

```text
AFTER
```

This demo should be reproducible.

---

# 58. DEMO OUTPUT

Something compelling:

```text
ProductionOS found 14 production risks.

CRITICAL
2

HIGH
5

MEDIUM
7

Examples:
- Cross-tenant document access
- Stripe webhook replay
- Unbounded LLM spending
- Unsafe file upload
```

After remediation:

```text
Critical: 0
High: 0

Static verified: 11
Test verified: 14
Runtime verified: 6

Gate:
PASS
```

Do not fabricate results.

The demo must actually execute.

---

# 59. OPEN-SOURCE POPULARITY STRATEGY

Build features developers will want to show other developers.

Prioritize:

```text
simple install
immediate useful output
beautiful terminal UX
fast operation
zero/low configuration
clear explanations
real findings
low false positives
good GitHub integration
strong README
real benchmark
```

A technically sophisticated tool that is annoying to install will struggle.

---

# 60. DISTRIBUTION

Aim eventually for installation such as:

```bash
npx productionos init
```

and a package installation method appropriate to the chosen CLI architecture.

Also provide agent-skill installation instructions.

Avoid requiring a hosted account for basic usage.

---

# 61. GITHUB REPOSITORY QUALITY

Prepare:

```text
issue templates
bug template
feature template
security policy
PR template
contribution guide
good labels
release workflow
dependency update automation
CI badges only where useful
```

Do not fill README with meaningless badges.

---

# 62. COMMUNITY ARCHITECTURE

Eventually allow community controls.

Potential format:

```text
@productionos/stripe
@productionos/supabase
@productionos/openai
@productionos/vercel
```

Third-party packs could provide:

```text
discovery
requirements
remediation
verification
docs
```

Design interfaces with this future in mind.

Do not build the marketplace now.

---

# 63. PLUGIN TRUST

Third-party controls/plugins must eventually have clear permission boundaries.

Never allow arbitrary community plugins to silently execute unrestricted code.

Design toward:

```text
manifested permissions
controlled subprocess execution
clear trust levels
signed package possibility
```

---

# 64. CLI DESIGN QUALITY

The CLI must feel professional.

Good:

```text
ProductionOS

Inspecting repository...

Detected
  Next.js 16
  PostgreSQL
  Prisma
  Stripe
  OpenAI
  Vercel

Capabilities
  ✓ Authentication
  ✓ Payments
  ✓ AI generation
  ✓ File uploads

Production profile
  SaaS

Analyzing 34 relevant controls...
```

Avoid excessive emojis and “AI magic” language.

---

# 65. ERROR MESSAGES

Errors should be actionable.

Bad:

```text
Error 46.
```

Good:

```text
Unable to inspect Prisma schema.

Expected:
prisma/schema.prisma

Detected:
Prisma dependency exists but no schema was found.

Try:
prodos inspect --database postgres
```

---

# 66. PERFORMANCE

ProductionOS itself must remain fast.

Use caching where justified.

Avoid invoking expensive AI calls for deterministic tasks.

Cache results keyed by:

```text
file hashes
control version
adapter version
configuration
```

Only re-evaluate changed state.

---

# 67. LLM USAGE POLICY

If ProductionOS eventually invokes an LLM itself:

Use the LLM for:

```text
classification
natural-language explanation
complex remediation planning
ambiguous architecture reasoning
```

Do NOT use it when deterministic code can answer reliably.

Examples:

```text
detect dependency → deterministic
parse package.json → deterministic
check header → deterministic
reason about architecture tradeoff → potentially LLM
```

Track LLM cost.

---

# 68. HALLUCINATION CONTROL

LLM-produced claims must not become evidence.

If an LLM says:

```text
Rate limiting is implemented correctly.
```

that is not verification.

Evidence must come from:

```text
code inspection rules
test execution
runtime probes
external tool results
human waiver
```

---

# 69. SAFE AUTONOMY

You have authority to:

```text
create repository structure
write implementation
add dependencies
write tests
run tests
refactor
write documentation
configure CI
prepare releases
create examples
```

Do not require my approval for normal development.

Require explicit approval before operations such as:

```text
deploying to real production
purchasing services
creating paid infrastructure
rotating real secrets
deleting cloud resources
destructive production database operations
publishing under my identity where approval is required
```

If credentials are needed, implement everything possible first and document exactly what I must provide.

---

# 70. NO FAKE COMPLETION

Never mark something complete if:

```text
tests fail
implementation is stubbed
verification is missing
documentation claims unsupported behavior
commands do not run
example output is fabricated
```

Use labels like:

```text
implemented
experimental
planned
unsupported
```

accurately.

---

# 71. DEVELOPMENT PHASES

Build in this order.

## PHASE 0 — Research and Specification

Before writing product code:

Create:

```text
docs/PRODUCT.md
docs/ARCHITECTURE.md
docs/CONTROL-MODEL.md
docs/MVP.md
```

Research the relevant ecosystem.

Identify competing/open-source tools.

Document:

```text
what ProductionOS does differently
what it explicitly will not do
MVP boundaries
threat model
trust model
evidence model
```

Do not spend excessive time researching once the architecture is sufficiently understood.

---

## PHASE 1 — Foundation

Implement:

```text
monorepo
CLI skeleton
configuration
manifest schema
state management
logging
error handling
testing infrastructure
```

Acceptance:

```text
CLI installs
CLI runs
manifest validates
tests pass
CI passes
```

---

## PHASE 2 — Repository Discovery

Implement Next.js-focused discovery.

Acceptance:

Given fixture repositories, discovery must correctly detect expected stack/capabilities.

No LLM required.

---

## PHASE 3 — Capability Graph

Convert discovery into normalized application capabilities.

Acceptance:

Fixture apps produce deterministic capability graphs.

---

## PHASE 4 — Policy Engine

Implement the first approximately 25–40 excellent controls.

Do NOT implement hundreds.

Prioritize:

```text
auth
authorization
tenancy
Stripe
LLM cost
uploads
secrets
rate limiting
database safety
timeouts
webhooks
logging
```

Acceptance:

Controls activate only when relevant.

False positives must be tested.

---

## PHASE 5 — Verification

Implement:

```text
static verification
test verification
evidence representation
evidence persistence
```

Do this BEFORE ambitious auto-remediation.

---

## PHASE 6 — Evidence Invalidation

Track relevant files/control dependencies.

Acceptance:

Changing affected code invalidates appropriate evidence.

Unrelated changes do not unnecessarily invalidate everything.

---

## PHASE 7 — Production Gate

Implement profile-aware gating and waivers.

Acceptance:

CI can reliably fail based on policy.

---

## PHASE 8 — Agent Skill

Create the ProductionOS skill.

Optimize for progressive context loading.

Test it with a real coding agent workflow.

---

## PHASE 9 — Remediation

Add carefully scoped auto-fix workflows.

Start with low-risk controls.

Examples:

```text
security headers
basic rate limiting
timeout wrappers
logging redaction
simple input validation
```

More architecture-sensitive fixes should require stronger analysis.

---

## PHASE 10 — Benchmark

Build ProductionBench.

Track detection, remediation and false positives.

Expose real benchmark results in the repository.

---

## PHASE 11 — Demo

Create an excellent reproducible demonstration.

Consider terminal recordings and architecture diagrams.

Do not fake them.

---

## PHASE 12 — Documentation and OSS Polish

Complete:

```text
README
guides
contribution docs
examples
release workflow
security policy
roadmap
```

---

## PHASE 13 — First Public Release

Prepare:

```text
v0.1.0
```

Requirements:

```text
no critical known bug
clean install
usable CLI
real controls
real evidence
real benchmark
real demo
CI green
good docs
```

---

# 72. MVP SUCCESS CRITERIA

v0.1 is successful if a developer can:

```bash
git clone example-saas
cd example-saas

npx productionos init
npx productionos inspect
npx productionos audit
npx productionos verify
npx productionos gate
```

and receive useful, correct production-engineering information.

The system must demonstrate at least:

```text
stack discovery
capability inference
relevant production requirements
static verification
integration verification
evidence
production gate
clear explanations
agent integration
```

---

# 73. QUALITY BAR

Ask yourself continuously:

> Would an experienced senior engineer consider this useful rather than gimmicky?

> Would I trust this tool inside an important repository?

> Can every important claim be demonstrated?

> Are false positives controlled?

> Did we add complexity because it was necessary or because it looked impressive?

> Could a developer understand why this recommendation exists?

> Can a new coding-agent session continue without previous conversation context?

> Can the tool recover state entirely from the repository?

If the answer is no, improve the design.

---

# 74. WHAT NOT TO BUILD

Do not waste the MVP on:

```text
fancy marketing dashboard
custom authentication for ProductionOS cloud
billing
enterprise management
huge plugin marketplace
20 framework adapters
Kubernetes support
SOC 2 dashboard
AI chatbot UI
```

until the core engine is excellent.

---

# 75. DIFFERENTIATION

The project must not merely say:

```text
“You forgot rate limiting.”
```

Its differentiation is:

```text
intent
→ application model
→ capability graph
→ requirements
→ implementation
→ independent verification
→ evidence
→ deployment gate
→ drift detection
```

Preserve this architecture.

---

# 76. USER EXPERIENCE PRINCIPLE

ProductionOS exists partly for developers who do not know what they do not know.

Never shame them.

Explain problems clearly.

Instead of:

```text
Obviously you should have implemented idempotency.
```

say:

```text
This payment endpoint may receive duplicate requests.

Without idempotency, the same logical purchase could be processed
more than once.

ProductionOS recommends...
```

---

# 77. PORTFOLIO QUALITY

This project must clearly demonstrate expertise in:

```text
software architecture
developer tooling
AI agents
DevSecOps
SRE
security
testing
AST/static analysis
policy engines
distributed-system concepts
CI/CD
observability
open-source engineering
```

Keep architecture and engineering reasoning visible through high-quality ADRs, documentation and benchmark results.

Avoid unnecessary code quantity.

A smaller deeply engineered system is more impressive than a huge shallow one.

---

# 78. GITHUB POPULARITY WITHOUT GIMMICKS

Optimize for real usefulness.

Potential hooks:

```text
“Can I launch this vibe-coded app?”

“Find what your AI coding agent forgot.”

“Production engineering for AI-generated software.”

“Your coding agent writes code. ProductionOS verifies whether it can survive users.”
```

But product quality comes first.

---

# 79. CONTENT/LAUNCH MATERIAL

Once v0.1 works, prepare:

```text
GitHub README
short launch post
technical deep-dive
demo GIF/video plan
architecture diagram
before/after example
benchmark report
Show HN draft
Reddit/dev community post draft
X/LinkedIn launch draft
```

Do not publish anything without appropriate approval.

---

# 80. POSSIBLE FUTURE COMMERCIALIZATION

Architect without requiring a commercial backend.

Potential future paid product:

```text
GitHub App
organization policies
historical evidence
team dashboards
centralized waivers
fleet monitoring
compliance mapping
production telemetry
custom enterprise controls
SSO
```

Keep open-source core genuinely useful.

---

# 81. LICENSING

Before finalizing the first release, evaluate:

```text
Apache-2.0
MIT
```

Choose based on project goals and document reasoning.

Do not change licensing later casually.

---

# 82. DEVELOPMENT LOG

Maintain:

```text
docs/DEVELOPMENT-STATE.md
```

Keep it short.

Template:

```text
Current milestone:
Completed:
Currently working:
Known failures:
Important decisions:
Next actions:
Human input required:
```

Update after significant milestones.

This exists primarily for context recovery.

---

# 83. SESSION START PROCEDURE

Whenever beginning a fresh agent session:

1. Read `docs/PRODUCT.md`.
2. Read `docs/DEVELOPMENT-STATE.md`.
3. Read relevant ADRs.
4. Run tests.
5. Run `git status`.
6. Inspect the current milestone.
7. Continue from recorded state.

Do not re-plan the entire project from scratch unless architecture genuinely needs revision.

---

# 84. SESSION END PROCEDURE

Before ending significant work:

1. Ensure code is formatted.
2. Run relevant tests.
3. Check git diff.
4. Remove debugging artifacts.
5. Update DEVELOPMENT-STATE.
6. Record architectural decisions if needed.
7. Note unresolved failures.
8. Make next steps obvious.

---

# 85. ANTI-TOKEN-WASTE RULES

Do not:

```text
repeat requirements already persisted
re-read entire repository unnecessarily
generate huge status prose
copy full files into planning messages
produce verbose internal commentary
keep redundant planning documents
recreate existing architectural context
```

Prefer concise structured state.

Use detailed explanation only where it improves engineering decisions or documentation.

---

# 86. ANTI-HALLUCINATION RULES

Never invent:

```text
test results
benchmark results
package APIs
framework behavior
security guarantees
deployment status
GitHub stars
users
performance numbers
cost numbers
```

Verify uncertain technical facts against primary documentation when internet access exists.

If verification is unavailable, explicitly label uncertainty.

---

# 87. DEPENDENCY POLICY

Before adding a dependency, answer:

```text
Why do we need it?

Can the platform already do this?

Is it actively maintained?

Is it appropriate for a developer-security tool?

What is its transitive dependency cost?

Can it be optional?
```

Avoid dependency bloat.

---

# 88. PERFORMANCE OF THE AGENT WORKFLOW

The coding agent itself should use this loop:

```text
Understand
↓
Identify WHY
↓
Inspect only relevant context
↓
Plan smallest coherent change
↓
Implement
↓
Run targeted verification
↓
Run broader regression tests where needed
↓
Update state
```

Do not enter endless plan/replan loops.

---

# 89. STOP CONDITIONS

Do not keep rewriting working architecture merely because an alternative exists.

Refactor only when:

```text
current design blocks requirements
measurable complexity exists
repeated duplication appears
testability suffers
performance requires it
security requires it
```

Avoid aesthetic rewrites.

---

# 90. FIRST TASK

Begin now.

Do not immediately write large amounts of product code.

Start by:

1. Creating the repository structure.
2. Researching the closest competing projects and existing agent-skill approaches.
3. Writing `docs/PRODUCT.md`.
4. Writing `docs/MVP.md`.
5. Writing `docs/ARCHITECTURE.md`.
6. Writing `docs/CONTROL-MODEL.md`.
7. Writing the initial ADR explaining why ProductionOS is an executable engine rather than merely an AI prompt/skill.
8. Designing the versioned Production Manifest schema.
9. Designing the control/evidence lifecycle.
10. Producing an implementation roadmap tied to executable milestones.

Before implementing each major subsystem, establish:

```text
WHY it is necessary
WHAT contract it exposes
HOW it will be tested
HOW success will be measured
```

Then proceed autonomously through the milestones.

Do not ask me for approval between ordinary development steps.

Stop and request my input only when:

* a genuine product decision cannot be inferred,
* credentials or accounts only I can provide are required,
* an irreversible or dangerous external action is required,
* money must be spent,
* production infrastructure would be modified,
* legal/licensing ownership decisions genuinely require me.

Otherwise continue until ProductionOS v0.1 is a functioning, tested, documented, installable open-source release candidate.

The final deliverable must not merely contain code.

It must include:

```text
working CLI
working core engine
initial controls
repository discovery
capability graph
manifest
evidence engine
production gate
agent skill
tests
benchmarks
demo application
documentation
CI
release workflow
OSS contribution setup
security documentation
architecture documentation
development-state recovery
launch materials
```

Most importantly:

> **Do not optimize for how much code you can generate. Optimize for how much engineering confidence the software can justify with evidence.**

Build something developers would actually install.
