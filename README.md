# agent-harness

A project harness for people who build a product with AI coding agents and do not read the diff. It was extracted from a real closed-source product built by one non-programmer. The story behind the rules stayed in that product, so here it starts with the extraction.

The harness does not remove acceptance; it changes what you accept. Rules backed by checks are held by machines: breaking one fails the build or the tests. A person accepts what the user sees. Which rules are held only by the text of the instructions, and where the promise ends, is described in `docs/SKELETON.md`.

Works with Claude Code and Codex. Node standard library only, MIT.

## See it in three minutes

Not a developer, or the computer has no Node and git yet? [Getting started](docs/GETTING-STARTED.md) prepares an empty computer with one prompt to the agent, runs this demonstration and explains it.

```sh
git clone https://github.com/yesgenius/agent-harness
cd agent-harness
npm install
npm run demo:guards
```

You need the Node version declared in `.nvmrc`. The demonstration breaks a copy of the repository with every planted violation from `scripts/lib/plants.js` and shows which check stopped each one. The working tree is not changed. `npm install` also points git in this clone at the hooks in `.githooks/` (the `prepare` script, the local `core.hooksPath` setting). If `harness.config.json` sets `gitIdentity`, it also writes the commit author's name and email into this clone.

```text
caught    The barrier looks in place but no longer refuses
          the-push-barrier-guards-the-declared-release-branch.test.js
caught    The check stopped seeing files and turned green because of it
          console-access-single-sink.test.js
caught    Two lines swapped: the send now runs before the record
          no-reminder-leaves-before-the-intent-is-recorded.test.js
```

## What is inside

| What | Where |
| --- | --- |
| The full skeleton: 15 layers in plain words, what each protects against and what holds it | `docs/SKELETON.md` |
| Getting started without a developer: prepare the computer, see the demonstration, move the harness | `docs/GETTING-STARTED.md` |
| How to move it into your project | `docs/SKELETON.md`, section "Moving it into your project" |
| Instructions for agents | `AGENTS.md` |
| Skills: `code-task-workflow`, `commit`, `push`, `rollback`, `resume-here`, `release` | `.claude/skills/`, `.agents/skills/` |
| Settings and deny rules | `.claude/`, `.codex/`, `.mcp.json` |
| Branch barriers | `.githooks/` |
| Build and checks | `scripts/` |
| Guards | `tests/guards/`, the list with their rules in `docs/specs/GUARDS.md` |
| An example process with an irreversible step; it does not move into your project | `example/`, described in `docs/specs/PRODUCT-REMINDER.md` |
| Work order template | `docs/WORK-ORDER-TEMPLATE.md` |
| Work orders for the agent, one file per job | `docs/work-orders/` |

## Commands

| Command | What it does |
| --- | --- |
| `npm run build` | Fast checks of code and documents, generation of documents |
| `npm test` | Guards and the example's tests, planted violations included. The full check is `npm run build`, then `npm test` |
| `npm run demo:guards` | The demonstration for a person |
| `npm run testserver` | Fixture pages for the regression run |
| `npm run verify` | Build, tests and a check that everything is committed: both edits and new files |

## Language

Everything in this repository is in English. A guard, `the-repository-text-stays-in-english`, fails on any letter of a script other than Latin; another language written in Latin letters is left to review. The agent talks to you in the language you write in. Work orders in `docs/work-orders/` are yours and may be in any language. To read these documents in your language in the browser, use the page translation built into it.

## Two warnings

**No sandbox.** The settings let the agent run commands without asking: otherwise you cannot hand over a work order and walk away. The deny rules catch an accidental command, not an agent's decision: they recognize commands that start with `rm -rf`, `rm -fr`, `git push --force`, `git push -f`, `git reset --hard` or `git clean -f`, but not the same operation written another way (`rm -r -f`, `git push origin +main`) or inside a script. They do not forbid reading files: for an agent with a command line such a ban is no obstacle. There is deliberately no ban on reading `.env`: it would stop the built-in read tool but not `cat .env` on the command line, and would promise protection that does not exist. So do not keep secrets in the project folder, and run the agent in a separate environment. How to turn confirmations on is in `docs/SKELETON.md`, section "Moving it into your project".

**Simplifications.** The console check and the log check read code token by token. They tell a regular expression literal from a division by the code before the slash: after a closing parenthesis this is a guess, and then a quote inside the literal can confuse them. The staged-secret scan catches only known shapes and is a net, not a proof. The process model is stored in JSON to avoid dependencies, and `scripts/fsm/fsm-log-prefixes.js` checks only logs, not constants. For a large project this is a starting point.

## What stayed in the original project

Only what is tied to it: packaging and publishing that specific product, releasing configuration fixes, locking a browser profile that is in use, plugins and sound hooks. If you need any of these, describe to the agent the failure you want to stop.

## License

MIT
