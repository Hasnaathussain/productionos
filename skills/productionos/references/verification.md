# Verification and evidence

`audit` evaluates controls but does not create proof. `verify` runs deterministic static checks and can run a target test command only when explicitly requested. Evidence records contain the control, method, command, working directory, exit status, affected-file hints, input fingerprint, output summary, and limitations.

Evidence is stale when the relevant file fingerprint or policy version changes. A test pass for the target repository is not automatically proof for every control. LLM explanations are never evidence.
