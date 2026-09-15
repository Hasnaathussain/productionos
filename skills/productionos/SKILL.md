---
name: productionos
description: Use the local ProductionOS CLI to discover an application, retrieve relevant production controls, implement the smallest justified change, and preserve independent verification evidence.
---

# ProductionOS agent workflow

ProductionOS is an executable local engine. The skill is only the agent interface; never replace its evidence with a confidence statement.

1. Recover compact state with `prodos status --json`.
2. If the target is uninitialized, run `prodos init`; then run `prodos inspect` and `prodos audit`.
3. For a focused task, run `prodos context --task "..."` and read only the relevant controls.
4. Use `prodos explain <CONTROL_ID> --agent --json` before changing architecture or security boundaries; use the human form when a fuller explanation is useful.
5. Determine why the control is relevant, inspect affected files, and make the smallest justified change.
6. Do not treat the builder's own summary as verification. Run `prodos verify`; use `--run-tests` only for an explicitly authorized local test command.
7. Review `prodos evidence --json` and `prodos gate --json`. Do not bypass a blocking control without an explicit, visible waiver.
8. Update the repository's development state when the work changes architecture, controls, or milestone status.

Progressive references:

- [workflow.md](references/workflow.md) for the lifecycle and recovery loop.
- [verification.md](references/verification.md) for evidence and invalidation.
- [safety.md](references/safety.md) for subprocess, privacy, and human-input boundaries.
- [remediation.md](references/remediation.md) for future `prodos fix` behavior.
