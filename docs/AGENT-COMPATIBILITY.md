# Agent compatibility and verification

ProductionOS has two separate contracts:

1. The deterministic `prodos` CLI is the product contract. Any coding agent that can run a local process and read JSON can use it.
2. `skills/productionos/SKILL.md` is a portable instruction layer. It tells an agent when to call the CLI, how to select context, and how to preserve the evidence boundary.

The repository does not claim that a model response is a compatibility test. `npm run agent:check` validates the skill package and executes the CLI workflow against both a clean fixture and an intentionally flawed fixture. It also reports which local agent CLIs are available for a separate live smoke test without invoking them or consuming provider credits.

## Automated check

```bash
npm run agent:check
```

The command must report:

- valid skill frontmatter and all progressive references;
- no machine-specific paths in the portable skill;
- the documented CLI commands still present in `prodos help`;
- a safe fixture completing `context -> explain -> verify -> evidence -> gate`;
- the flawed fixture producing a blocking gate rather than a false pass;
- local availability of known agent CLIs, without running a model-backed session.

## Live smoke matrix

Run each smoke test from a fresh copy of the repository or a disposable target directory. Set the agent to read `skills/productionos/SKILL.md`, then use this task:

```text
Use ProductionOS on this repository for a read-only review of the task "fix login authorization".
Run the documented status, context, explain, audit, verify, evidence, and gate commands.
Do not edit files. Do not treat your summary as evidence. Report the exact commands and exit statuses.
```

Expected behavior for every agent:

1. It discovers or initializes `.productionos/` before relying on reports.
2. It requests focused context instead of dumping the entire control catalog.
3. It distinguishes findings from verification evidence.
4. It reports the blocked gate for `fixtures/nextjs-saas` and the passing gate for `fixtures/minimal-next`.
5. It does not upload source, contact production endpoints, or claim certification.

### Gemini CLI

Gemini CLI supports Agent Skills discovered from `.agents/skills/` and `.gemini/skills/`. From the repository root, link or install the skill into a disposable workspace, then run the smoke prompt:

```bash
gemini skills link ./skills/productionos --scope workspace
gemini
```

The skill is expected to invoke the local `prodos` CLI after the repository has been built. See the [Gemini CLI Agent Skills guide](https://github.com/google-gemini/gemini-cli/blob/main/docs/cli/using-agent-skills.md) for the current discovery and consent behavior.

### Cursor

Cursor project rules use `.cursor/rules` and MDC frontmatter. Create a disposable wrapper that points the agent to the portable skill and the repository commands; do not copy the local maintainer-only `AGENTS.md` into a public project.

```text
---
description: Evidence-first ProductionOS workflow
alwaysApply: false
---
Read skills/productionos/SKILL.md when a production-readiness task is requested. Use the local prodos CLI and preserve its evidence boundary.
```

Run the smoke prompt in Cursor Agent or Cursor CLI and save the transcript outside the repository. See [Cursor Rules](https://docs.cursor.com/context/rules-for-ai) for the current rule format and scope behavior.

### Claude Code

Claude Code can use a project instruction file or an imported local Markdown reference. In a disposable copy, create a `CLAUDE.md` containing:

```text
Read @skills/productionos/SKILL.md for production-readiness work. Use the local prodos CLI; never replace CLI evidence with a model assertion.
```

Run the smoke prompt with the normal permission prompts enabled. Do not use a bypass-permissions option for this validation. The [Claude Code CLI reference](https://docs.anthropic.com/en/docs/claude-code/cli-usage) documents non-interactive output and permission modes.

### Codex

Expose the `skills/productionos/` directory through the Codex skill mechanism available in the host, or include its `SKILL.md` as the task’s local skill. Run the same smoke prompt and inspect the generated command results. The portable skill intentionally does not depend on Codex-only tools.

## Recording a live result

Record the date, agent version, operating system, exact prompt, commands observed, exit statuses, and any deviation in an issue or release note. Never put API keys, private source, or full provider transcripts into the repository. A live smoke test demonstrates integration behavior for that environment; it does not prove that every model, framework, or repository is supported.
