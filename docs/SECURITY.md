# ProductionOS security model

ProductionOS operates on repositories and can optionally run a repository test command. The security model therefore treats both repository contents and generated tool output as untrusted until independently checked.

## Boundaries

- Discovery is read-only and bounded. It parses metadata and TypeScript syntax; it does not import or execute application code.
- Static policy checks consume a repository snapshot and produce findings. They do not create verification evidence by themselves.
- Test verification is an explicit subprocess operation. The command, working directory, exit code, timestamps, affected-file hints, fingerprint, and limitations are recorded.
- Evidence is invalidated when the relevant files or policy version change. Natural-language claims from an agent never count as evidence.
- The CLI is local-first and does not upload source or send telemetry by default.

## Threats considered in v0.1

- A repository may contain secrets, hostile source text, symlinks, oversized files, malformed configuration, or misleading generated output.
- A target test command may have network access or side effects. It is never run implicitly by discovery, audit, or gate.
- The load command may send requests only after an explicit `--allow-local` authorization and only to credential-free loopback HTTP(S) URLs; requests, concurrency, and timeouts are bounded.
- A stale evidence record may incorrectly make an old control appear verified. Fingerprints and affected-file hints are checked before evidence is merged.
- A waiver may hide an unresolved control. Waivers remain visible in gate output and are bounded by owner, reason, and optional expiry.
- An LLM or coding agent may claim completion without proof. ProductionOS keeps planning, findings, and evidence as separate records.

## Reporting

Do not include real secrets or private source in a public issue. Use the private repository-host security channel or contact the maintainer until a dedicated security contact is published. The repository-level policy is in [`SECURITY.md`](../SECURITY.md).

These are design properties and testable implementation goals, not a certification or guarantee.
