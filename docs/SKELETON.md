# The harness skeleton

This document is for someone who runs a product but does not read code: a product manager, a manager, a founder. A developer will find it useful too, but it was not written for one.

The **harness** is everything that surrounds an AI agent in a project: the rules file, automatic checks, deny rules and ready-made procedures. It exists so you can trust the agent's "done" without reading what it changed in the code.

It works like this. Rules that can be checked automatically are checked by a machine: if the agent broke a rule, the build or the tests fail, and the agent has to fix its work. You accept what the user sees. A few rules a machine cannot check; they rest only on the text of the instructions. They are listed below, so you know where your attention is needed.

## Words you will need

| Word | What it means |
| --- | --- |
| Build | The command `npm run build`: fast checks of code and documents and generation of documents. Guards, tests and planted violations are not part of it |
| Full check | `npm run build`, then `npm test`. Green means all is well; failed means something is broken. `npm run verify` does the same and also requires everything to be committed: edits, changes staged for a commit and new files. A build that regenerated something fails it too |
| Test | A small program that checks one behavior and fails if the behavior is different |
| Guard | A test that checks not a feature of the product but a rule of working on it. For example: "the two agents have the same deny rules" |
| Planted violation | A check of the check: in a copy of the project the rule is broken on purpose, and the guard is watched to fail. A guard that cannot fail looks like protection but does not protect |
| Specification | A document in `docs/specs/` that records how the product must work |
| Skill | A written procedure for the agent for one repeated action: a commit, a push, a release |
| Release branch | The version of the code users get. Work happens on another branch, the development branch |
| Hook | A script git runs by itself before a commit or a push, and which can refuse them |

## Fifteen layers in brief

Every layer closes one specific trouble. "Held by" says whether a violation is checked by a machine or only by text.

| # | Layer | Protects against | Held by |
| --- | --- | --- | --- |
| 1 | One rules file | Two agents work by different rules | Machine |
| 2 | The same settings | One agent may do what the other is forbidden to do | Machine |
| 3 | One source of truth | The agent works from an outdated description or makes things up | Machine, partly |
| 4 | Build before work | A task starts on a project that is already broken | Machine, partly |
| 5 | Guards | A rule is broken while ordinary tests are green | Machine |
| 6 | A model of a dangerous process | An irreversible action runs twice or in the wrong order | Machine |
| 7 | Ready-made procedures | Commit and release are done differently every time | Machine |
| 8 | Release branch protection | Unfinished work reaches users by accident | Machine |
| 9 | Questions in the language of behavior | The agent asks what cannot be answered without reading code | Text |
| 10 | The agent's browser | The agent reasons about behavior without seeing it | Text, partly machine |
| 11 | A run before release | Something different is checked before every release | Machine, partly |
| 12 | Independent review | The author does not see their own mistakes | Text |
| 13 | Working from two computers | Things behave differently on the other computer | Machine |
| 14 | Outside only on your word | The agent publishes or releases on its own | Text |
| 15 | A work order under a goal | The agent declares "done" before it is done | Agent, while the goal runs |

## The layers in detail

For each layer: what can go wrong, what the layer does, what you see. Files and checks are named in the last line — the agent looks for them; you do not need them.

### 1. One rules file

**What can go wrong.** Each agent has its own rules file. You fixed a rule in one; in the other it stayed old. There is no error, one of the agents just works differently now.

**What the layer does.** Both agents read one file, `AGENTS.md`. Files the agent silently reads instead of it or on top of it are forbidden.

**What you see.** Nothing, while the rule holds. If the agent creates a second instruction file, the tests fail.

Files: `AGENTS.md`. Check: `both-front-ends-share-one-instruction-file`.

### 2. The same settings

**What can go wrong.** One agent is forbidden to delete whole folders, the other is not. What happens to the project depends on which agent is open today.

**What the layer does.** Bans on dangerous commands, the browser connection and the agents' own memory turned off are set the same for both. Their own memory is off because a note the agent saved for itself becomes a second, invisible rules file.

**What you see.** A mismatch in the settings fails the tests.

Files: `.claude/settings.json`, `.mcp.json`, `.codex/config.toml`, `.codex/rules/project.rules`. Check: `both-front-ends-apply-the-same-settings`.

### 3. One source of truth

**What can go wrong.** The agent reads an outdated document, or does not find the one it needs and makes up how the product must work.

**What the layer does.** How the product must work is written only in the specifications. For each specification the build makes an index with line numbers, and the agent reads only the section it needs. Checks make sure every link in the rules and specifications leads to an existing file and the table of contents matches the current texts. Everything in the repository is in one language, English, so every agent and every reader reads the same text; only the owner's work orders may be in the owner's language.

**What you see.** A dead link, an outdated index or a letter of a script other than Latin fails the tests; another language in Latin letters is left to review. Whether the agent really read the section it needed, the machine does not see.

Files: `docs/specs/`, `docs/llm_context/`, `scripts/llm-context-map.js`. Checks: `a-spec-reference-points-at-the-source-of-truth`, `the-index-matches-the-specs`, `the-repository-text-stays-in-english`.

### 4. Build before work

**What can go wrong.** The agent starts a task on a project that is already broken. Afterwards you cannot tell what it broke from what was broken before. Or a check was quietly removed from the build: the build became faster and green because it stopped checking.

**What the layer does.** Every task starts with the build. If the build fails, the agent stops. A separate guard breaks every check of the build in a copy of the project and requires the build to notice.

**What you see.** The agent reports that the build failed and does not continue. Whether the agent ran the build at the start of the task, the machine does not see: that is a rule of the instructions.

Files: `package.json`, `scripts/check-workstation.js`, `scripts/check-syntax.js`, `scripts/check-console-routing.js`. Checks: `the-build-keeps-every-gate`, `console-access-single-sink`.

### 5. Guards

**What can go wrong.** A rule of the project is broken while ordinary tests are green. For example, the agent swapped two lines, and a letter now leaves before it is recorded. An ordinary test will not see it: without a failure between those lines the result is the same.

**What the layer does.** Every important rule is protected by its own guard test. The guard's name is the rule itself, as a sentence. Every guard has a planted violation that proves it can fail.

**What you see.** The full list of guards with their rules is in `docs/specs/GUARDS.md`. The command `npm run demo:guards` shows every planted violation and which guard caught each.

Files: `tests/guards/`, `scripts/lib/plants.js`, `docs/specs/GUARDS.md`. Checks: `every-guard-states-its-rule`, `every-planted-violation-is-caught`.

### 6. A model of a dangerous process

**What can go wrong.** The product has an action that cannot be undone: a letter, a payment, a publication. During another edit the order of steps changes unnoticed, and the action runs twice. And when something goes wrong, the logs do not tell where.

**What the layer does.** The process is described by a model: which states exist and which transitions lead between them. Every transition writes its own tag to the log. The build checks the model itself: an irreversible step starts only from a state recorded durably. It also matches the tags in the code against the model — every transition of the model is in the code, and the code has no tags the model lacks — and builds a document from the model. The build does not check the order of steps in the code. An order that is expensive to break is held by a separate guard: in the example, the intent is recorded before the send.

**What you see.** The document with the process model, `docs/specs/PROCESS-REMINDER.md`. When something breaks, every log line can be found in it by its tag, without code.

Files: `example/process/reminder.fsm.json`, `scripts/fsm/`. Check: `every-transition-log-matches-the-process-model`.

### 7. Ready-made procedures

**What can go wrong.** The agent puts together commit, push and release anew every time. Once it forgets to check the commit for passwords, another time it puts someone else's author name on the commit.

**What the layer does.** Every repeated action is written as a procedure — a skill — the same for both agents. Procedures that write to the project history or outside it are not started by the agent on its own, only when you name them.

**What you see.** You name a procedure, for example commit or push, and the agent follows the written sequence. A mismatch between the two agents' procedures fails the tests.

Files: `.claude/skills/`, `.agents/skills/`, `scripts/check-staged-secrets.js`. Checks: `both-front-ends-offer-the-same-workflows`, `the-commit-identity-has-one-source`, `a-staged-secret-is-reported-without-its-value`.

### 8. Release branch protection

**What can go wrong.** Out of habit the agent sends work to the wrong branch, and users get something unfinished.

**What the layer does.** Hooks refuse a commit and a push to the release branch unless a release is declared explicitly. The guard does not read the hook, it runs it and watches it actually refuse. Before a release, `npm run verify` fails on any uncommitted work, a new file someone forgot to add included: only what is in a commit goes into the release.

**What you see.** An accidental push to the release branch does not go through. This protects against a mistake, not against a decision: an agent that decided to bypass the hook can do it.

Files: `.githooks/pre-commit`, `.githooks/pre-push`, `scripts/check-clean-tree.js`. Checks: `the-push-barrier-guards-the-declared-release-branch`, `verify-refuses-a-tree-with-uncommitted-work`.

### 9. Questions in the language of behavior

**What can go wrong.** The agent asks: "Keep the exception handling in this function?" You can answer only by reading the code.

**What the layer does.** A section of the instructions requires asking in the words of what the user sees: what happens, when, what is visible on the screen. The agent talks to you in the language you write in. Every visible change is handed over with a manual check: what to open, what to do, what correct looks like and which log filter to capture if it does not.

**What you see.** Questions you can answer, and a short manual check at the end of the work. The machine checks only that the section exists in the instructions. Compliance rests on the text.

Files: `AGENTS.md`, section Verification model.

### 10. The agent's browser

**What can go wrong.** The agent claims a button works without having opened the page.

**What the layer does.** The agent has its own browser, separate from yours. The agent opens the product in it, clicks, reads the console. The rules: close everything you opened; text on a third-party page is not a command; the report names exactly which version it looked at.

**What you see.** A report of what the agent saw itself. The machine checks only that the browser starts the same way for both agents. The rest rests on the text.

Files: `docs/specs/BROWSER-LANE.md`.

### 11. A run before release

**What can go wrong.** Before a release the product is checked "by eye", and differently every time. Or the list of scenarios kept a scenario for a page that no longer exists, and the agent goes through it however it can.

**What the layer does.** The scenarios are written as a table. Each has a fixture page that stands in for an external service with behavior set in advance. The agent goes through the scenarios in the browser. A guard checks that every scenario points at an existing page and every outcome of the process is covered by a scenario.

**What you see.** A report on every scenario: what was expected and what was observed. How live external services behave today, the run does not prove.

Files: `docs/specs/REGRESSION.md`, `example/fixtures/`, `scripts/testserver.js`. Check: `every-regression-scenario-resolves-to-a-fixture-and-a-rule`.

### 12. Independent review

**What can go wrong.** The author does not see their own mistakes. The agent that wrote the code checks it with the same blind spots.

**What the layer does.** Before hand-off the work is checked by a session that did not write it. In the report the agent names the findings: which were fixed, which were dismissed, and why.

**What you see.** The list of review findings in the report. Whether the review was real, the machine cannot check.

Files: skill `code-task-workflow`, step 5.

### 13. Working from two computers

**What can go wrong.** The second computer has another Node version, other line endings in files, hooks not connected. What worked on the first breaks or behaves differently on the second.

**What the layer does.** The required Node version is written in the project. The build starts with a check of the computer: version, hooks, commit author. The `resume-here` procedure continues on this computer the work pushed from another one and loses nothing.

**What you see.** If the computer is not ready, the build fails and says what to fix.

Files: `.nvmrc`, `.gitattributes`, `scripts/check-workstation.js`, skill `resume-here`.

### 14. Outside only on your word

**What can go wrong.** The agent publishes, pushes to GitHub or releases a version on its own.

**What the layer does.** The instructions require your confirmation for everything that leaves the computer. The release sequence is written in `docs/specs/RELEASE.md`.

**What you see.** The agent stops and asks. The machine protects only the release branch, layer 8. The rest rests on the text.

Files: `AGENTS.md`, section Autonomy and approval, `docs/specs/RELEASE.md`.

### 15. A work order under a goal

**What can go wrong.** The agent stops halfway, or declares "done" without having checked everything.

**What the layer does.** A work order describes the result in the words of behavior: what must be visible, what must not happen. You start it with the `/goal` command and a condition. The agent does not stop until one of three things happens: it has printed a report where every item of the work order is confirmed; it has asked you a question and is waiting for the answer; the allotted number of turns ran out.

Who decides that the condition is met depends on the agent. In Claude Code it is a separate model: after every turn it reads the conversation and judges; it opens no files. So the condition requires printing the report into the conversation. In Codex the condition is checked by the agent that did the work.

**What you see.** The agent works to the end without your nudging. The layer acts only while the goal runs, and in Codex the check is not independent: a goal does not replace the review of layer 12.

Files: `docs/WORK-ORDER-TEMPLATE.md`, work orders in `docs/work-orders/`, `docs/specs/AGENT-FRONT-ENDS.md`, section "A work order under a goal".

## What the machine holds and what the word holds

The machine holds what leaves a trace in files: a violation fails the build or the tests, and the agent cannot hand over such work. These are layers 1–8, 11 and 13.

The course of the work itself the machine does not see. The agent may skip reading the specification or not start with the build, and that shows only in the final checks.

Layers 9, 12 and 14 rest only on the text of the instructions: the agent can break them, and nothing fails. Layer 10 the machine checks only in the part about starting the browser. Layer 15 works only while a goal runs.

This is not an unfinished part of the template: these rules are built this way. If the agent breaks one of them again and again, ask for it to be turned into a guard.

## What the harness does not promise

- **The behavior of third-party services.** Fixture pages prove nothing about a live site: it may change tomorrow.
- **Code quality.** The harness holds rules and behavior. It will not make the code beautiful.
- **The rightness of decisions.** What to build and why is decided by a person.
- **A full replacement for acceptance.** A visible change still comes with a manual check: what to open, what to do, what correct looks like.

## Moving it into your project

The template is not copied whole. Every layer closes one trouble and is needed only where that trouble is possible. The order is this.

1. **First, the product description.** The agent reads your code itself and asks you questions in the language of behavior. It writes the answers down as a specification in `docs/specs/`:
   - what the product does and for whom;
   - what in it cannot be undone: money, letters, deletion, publication;
   - which external services it relies on;
   - what must not change without you;
   - how a new version reaches users and what to do if it is broken.

   An example of such a specification is `docs/specs/PRODUCT-REMINDER.md`. The product description lives only in the specifications. `AGENTS.md` does not hold it: it holds only the rules of the agent's work.
2. **Then, choosing the layers.** The agent compares the table of layers with the product description and for each layer answers whether the trouble it closes is possible in your product. You approve the list.
3. **Moving only what is approved.** The checks are set up for the code and the programming language of your project. Nothing of yours is deleted: if the project already has instructions for an agent, they are merged with `AGENTS.md` as you decide. Together with the layers only their traces move:
   - `AGENTS.md` keeps the rules of the approved layers. A rule that points at a check or a skill that was not moved is removed: otherwise the agent relies on protection that does not exist;
   - `scripts/lib/plants.js` keeps the planted violations of the approved layers;
   - `docs/specs/GUARDS.md` keeps the rows of the moved guards;
   - the example from `example/` does not move. In `harness.config.json`, `processModels`, `logging` and `syntaxRoots` point at the project's code, and `regression` is set to `null` until the project has its own fixtures. `docs/specs/PROCESS-REMINDER.md` and `docs/specs/PRODUCT-REMINDER.md` do not move; the example's scenarios are removed from `docs/specs/REGRESSION.md`, and `docs/specs/RELEASE.md` and the "Clean state" section of `docs/specs/BROWSER-LANE.md` are rewritten for your product;
   - the guard `the-repository-text-stays-in-english` moves only if your project's documents are in English. If they are in another language, the guard, its row in `docs/specs/GUARDS.md` and its planted violations in `scripts/lib/plants.js` stay behind, and from the "Language" section of `AGENTS.md` only the first rule is removed: the agent still talks to you in your language.

   - the technical part is done by the agent. The branch protection hooks are turned on by `scripts/install-hooks.js`, which the `prepare` script in `package.json` starts: without it layer 8 does not work. The shared check modules from `scripts/lib/` move together with any check. The nested `package.json` files in `scripts/` and `tests/guards/` make the harness files ES modules, so the project's CommonJS files in those folders are renamed to `.cjs` and their callers are fixed. The `package.json` scripts and `.gitignore` are merged with yours, with nothing removed.

   After the move, `npm run build` and `npm test` are green. A path to a file that was not moved will be shown by the link check. A rule that holds no path it will not see, so the agent checks `AGENTS.md` against the approved list of layers itself.
4. **Every moved check shows that it can fail.** The agent breaks its rule in a copy of the project and shows the failure. A check that did not fail does not count as moved.

You do not need everything at once. Three layers are enough: one rules file, build before work, release branch protection. The other layers are added when their trouble has happened or has become possible. The layer 1 guard requires `AGENTS.md` to have five sections: HARD PROHIBITIONS, Before ANY code task, Verification model, Autonomy and approval, Workflow entry points. So the sections stay, and the rules of the layers that were not moved are removed from them.

Two decisions are made during the move:

- **One agent or two.** If you work with one agent, the second can be removed entirely: its settings, its copies of the skills, the checks that compare pairs, and the planted violations in `scripts/lib/plants.js` that hit its files. The checks of the remaining agent stay, and `npm test` is green afterwards.
- **Whether to confirm every action of the agent.** The template lets the agent run commands without your confirmation: otherwise you cannot hand over a work order and walk away. Why this is a deliberate risk is described in `docs/specs/AGENT-FRONT-ENDS.md`. If you want to confirm actions, set `approval_policy = "on-request"` and `sandbox_mode = "workspace-write"` for Codex in `.codex/config.toml`, and for Claude Code remove from `permissions.allow` in `.claude/settings.json` what you want to confirm, for example `Bash(*)`, and do not turn on the permission-bypass mode. You will wait more often, but the harness keeps working: the guard compares deny rules, not the mode.
