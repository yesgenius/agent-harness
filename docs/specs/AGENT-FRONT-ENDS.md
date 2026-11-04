# Two agents, one project

The project is run by two agents: Claude Code and Codex. What the product owner gets must not depend on which of them is open right now.

## One instruction file

Both agents read `AGENTS.md`. Claude Code reads it when there is no file of its own format next to it. Check this on your version: the `/memory` command shows which files are loaded.

A copy of the instructions under another name adds no rule. Every change has to be made twice, and the forgotten half shows no sign of itself.

## Shadow files

The agent reads these files instead of the shared one or on top of it, and reports nothing about it:

| File | Why it is dangerous |
| --- | --- |
| `CLAUDE.md` at the root or in `.claude/`, `AGENTS.md` in `.claude/` | A file of the agent's own format appears, and the shared one stops being the only one |
| `CLAUDE.local.md` | Usually in `.gitignore`, so it is visible only on disk |
| `AGENTS.override.md` | Replaces the shared file for the second agent |
| Nested `AGENTS.md`, `CLAUDE.md` | Apply only in their own folder |
| `project_doc_fallback_filenames` in `.codex/config.toml` | Declares one more name, so the list must be empty |

Guard: `tests/guards/both-front-ends-share-one-instruction-file.test.js`.

## Skills in pairs

A skill is a `SKILL.md` file with instructions for one repeated action: a commit, a push, a release. Every skill lives twice: `.claude/skills/<name>/SKILL.md` and `.agents/skills/<name>/SKILL.md`. The texts match byte for byte, except for the invocation field. A skill that changes history or branches, removes uncommitted work or writes outside the machine (commit, push, release, rollback, resuming work from another machine) is not started by the agent on its own, only when the owner names it. Both copies declare this ban: `disable-model-invocation: true` in the first, `allow_implicit_invocation: false` in `agents/openai.yaml` in the second. `code-task-workflow` writes to the working folder and to temporary copies of the repository for tests, which the tests remove themselves. The agent starts it on its own for every code task.

Guard: `tests/guards/both-front-ends-offer-the-same-workflows.test.js`.

## Settings

| What | First agent | Second agent |
| --- | --- | --- |
| Command deny rules | `.claude/settings.json`, `permissions.deny` | `.codex/rules/project.rules` |
| Browser tool | `.mcp.json` | `.codex/config.toml` |
| Browser tool approval: every tool runs without a prompt | `permissions.allow`: `mcp__chrome-devtools` | `default_tools_approval_mode = "approve"` in the browser server table |
| Effort | `effortLevel` | `model_reasoning_effort` |
| Auto-memory | `autoMemoryEnabled: false` | `[features] memories = false` |

Auto-memory is off because a note the agent saved for itself becomes a second source of rules. A rule lives in the repository, where both agents see it and the guards check it.

Top-level TOML keys stand above the first table. A key that slipped inside a table stays valid and configures nothing. `.codex/config.toml` holds only the tables the project declares: its own settings and one table per server in `.mcp.json`. The second agent writes an approval it remembers into this tracked file, so a tool it asks about leaves a change nobody asked for and stops the next workflow; that is why the browser server is approved whole.

Guard: `tests/guards/both-front-ends-apply-the-same-settings.test.js`.

## Permissions: a deliberate risk

The template is built for a mode where the owner hands over a work order and walks away, and the agent works for hours and stops only on product questions. So commands run without a sandbox and without permission prompts.

In this mode protection rests on three things: the shared deny list, the rules of `AGENTS.md` and the git history. The deny list catches an accidental command, not an agent's decision: it recognizes a command by the start of the line, so the same operation written another way or inside a script passes. This is not a sandbox. Reading files is not denied: an agent allowed a command line will read a file without the read tool. Secrets are not kept in the project folder. Run the agent in a separate environment, with no one else's data and no secrets you cannot afford to lose.

Claude Code's permission-bypass mode is set on the workstation, not in the repository: so the project does not impose it on someone who just cloned the code.

## A work order under a goal

The owner starts a work order with the command `/goal <condition>`. The agent works until the condition is met and does not stop halfway. Only the owner can set a goal; the agent does not set one for itself.

Who decides that the condition is met differs between the agents:

| | Claude Code | Codex |
| --- | --- | --- |
| Who declares the goal met | A separate model judges by the conversation after every turn. It runs no commands and reads no files | The goal text is both the first request and the completion criteria. The agent itself checks against them |
| Control | `/goal` shows the goal, `/goal clear` removes it | `/goal`, `/goal edit`, `/goal pause`, `/goal resume`, `/goal clear` |

Checked against the documentation of Claude Code 2.1.289 and Codex 0.160.0. In Claude Code the command is unavailable when `disableAllHooks` is on.

Rules of the condition:

- **The confirmation is printed into the conversation.** The Claude Code judge sees only the conversation, so the condition requires printing the report section and the result of the checks, not saying that they exist.
- **The condition has three exits joined by "or":** a measurable end, a stop on a question to the owner, a turn limit. The limit is written as a branch of the condition, not as a separate command: otherwise the judge may take it for an instruction to the agent. The goal is met only by the first exit. A question and the turn limit stop the work but do not finish it, so in its last message the agent names the exit and lists what is not done.
- **The goal text is at most 4000 characters.** The details live in the work order file the goal points at (`docs/work-orders/README.md`).

The launch line: `docs/WORK-ORDER-TEMPLATE.md`. A goal does not replace independent review: in Codex the condition is checked by the same agent that did the work.
