# Guards

A guard is a test that protects a rule of the project, not a feature of the product. An agent may read an instruction its own way. A red build leaves no room for interpretation.

## Guards of this repository

The harness is protected by the guards in `tests/guards/`, the example by the guards in `example/tests/guards/`. The "Plants" column says how many planted violations from `scripts/lib/plants.js` the guard is held to: `npm test` breaks a copy of the repository with each of them and requires the guard to fail.

| Guard | Rule | What breaks without it | Plants |
| --- | --- | --- | --- |
| `both-front-ends-share-one-instruction-file` | Both agents have one instruction file and no shadow files | A rule was fixed in one copy, the other agent works by the old one | 2 |
| `both-front-ends-apply-the-same-settings` | Deny rules, the browser and auto-memory mean the same for both agents | One agent may do what the other is forbidden to do | 3 |
| `both-front-ends-offer-the-same-workflows` | The skills of the two agents match byte for byte | A commit or release step exists for one agent only | 1 |
| `a-spec-reference-points-at-the-source-of-truth` | Every path in the instructions, skills and specifications exists | The agent follows a link into nothing and makes the rest up | 1 |
| `the-index-matches-the-specs` | The index in `docs/llm_context/` is built from the current specifications | The agent reads the wrong lines and is sure it read the right ones | 1 |
| `the-build-keeps-every-gate` | No build step is dropped or replaced with a no-op | The build became faster and green because it stopped checking | 3 |
| `console-access-single-sink` | Logs are written only through one module | Logs cannot be turned on and filtered in one place | 3 |
| `every-transition-log-matches-the-process-model` | Log tags match the transitions of the process model | A broken run cannot be read from its log | 4 |
| `every-regression-scenario-resolves-to-a-fixture-and-a-rule` | Every scenario of the run points at an existing page and transition | The agent goes through a mandatory scenario however it can | 1 |
| `verify-refuses-a-tree-with-uncommitted-work` | `npm run verify` fails on any uncommitted work, a new file included | A release shipped without a file someone forgot to add, and verify was green | 1 |
| `a-check-started-through-a-link-still-runs` | A command started through a linked folder ends the same way as when started directly; the start flag is read only through `isMain` from `scripts/lib/entry.js` | A check was started through a link or on an old Node, silently skipped itself and reported success | 4 |
| `the-repository-text-stays-in-english` | No authored text file holds a letter of a script other than Latin; the owner's work orders are exempt | Half the rules are in a language part of the readers cannot read, and nobody notices which half | 2 |
| `the-push-barrier-guards-the-declared-release-branch` | A push to the release branch without a declared release is refused | The release branch was moved by an accidental push | 2 |
| `the-commit-identity-has-one-source` | The commit author is set in one place | The history has two different authors, and nobody notices | 1 |
| `a-staged-secret-is-reported-without-its-value` | A commit is scanned for secrets before its content is shown | The key is already on the screen and in the session log when it is found | 1 |
| `every-guard-states-its-rule` | A guard's name is a sentence, its header explains why it exists, and this table matches the guards and their plants | The agent sees a red test with no explanation and fixes the test; the rule cannot be found without opening the test | 4 |
| `every-planted-violation-is-caught` | Every planted violation fails its guard | A guard that cannot fail looks like protection | — |
| `a-published-provider-fix-reaches-a-user-within-an-hour` | Example: a fixed provider setting reaches the user within an hour | The interval was raised, ordinary tests do not see it | 2 |
| `no-reminder-leaves-before-the-intent-is-recorded` | Example: a reminder leaves only after it is recorded | After a restart the same reminder leaves a second time | 1 |
| `no-provider-name-outlives-the-provider-config` | Example: the provider's name is written only in its configuration | A description of the service's behavior went stale, and agents keep trusting it | 1 |

The table is checked by the guard `every-guard-states-its-rule`: every guard has a row, every row has a guard, and the count of plants matches `scripts/lib/plants.js`. `npm run demo:guards` shows every plant in turn.

## When a guard appears

- A rule was broken, and nothing caught it.
- The product stated a new rule whose violation is not visible from outside.
- An ordinary test cannot catch the violation by its nature: for example, the error shows only in a race.

A rule that breaks loudly needs no guard: an ordinary test is enough.

## How a guard is built

1. **The name is the rule.** The file reads as a sentence: `no-reminder-leaves-before-the-intent-is-recorded`. A failing test says by itself what is broken.
2. **The header says what breaks without it.** An agent that sees a red test with no explanation tends to fix the test. With an explanation it fixes the change.
3. **Values are read from their source.** A guard takes the branch name from `harness.config.json` and the service names from their config, or it becomes one more copy itself.
4. **A walk that found no files fails.** A check that read nothing finds nothing, and that looks like a clean result. So every walk has a floor of what it must read: `assertFloor` from `scripts/lib/scan.js` fails when less was read.
5. **A guard fails when the shape it reads is gone.** If the line it looks for disappeared, that is an error, not "no violations".
6. **The build and the guard call one function.** Their own copies of a walk would let them demand different things while both stay green.
7. **The violation is planted.** An entry in `scripts/lib/plants.js` breaks the rule in a copy of the repository. The guard must pass before the break and fail after it. A guard that cannot fail is worse than none: it reads as protection.

## Five techniques

| Technique | When it is needed | Example |
| --- | --- | --- |
| Comparing twins | The same thing lives in two places | `tests/guards/both-front-ends-offer-the-same-workflows.test.js` |
| Running instead of reading | Behavior matters, not text | `tests/guards/the-push-barrier-guards-the-declared-release-branch.test.js` |
| An inequality on a constant | Ordinary tests read the constant and therefore do not bound it | `example/tests/guards/a-published-provider-fix-reaches-a-user-within-an-hour.test.js` |
| A witness in a stand-in | The violation shows only on a failure between two steps, and a run without a failure ends the same | `example/tests/guards/no-reminder-leaves-before-the-intent-is-recorded.test.js` |
| A table as an interface | A document is read by a machine | `tests/guards/every-regression-scenario-resolves-to-a-fixture-and-a-rule.test.js` |

A witness is a stand-in accomplice that looks at the state at the right moment: the transport checks, at the moment of sending, that the intent is already recorded. Comparing the positions of two lines in the source is simpler, but such a check fails on a harmless reordering and misses a record that was started and not awaited. The witness checks the promise itself.

## How to change

If a guard refuses a change, either the change or the rule is wrong. Changing a rule is the product's decision, and the agent asks it in the language of behavior. Weakening a guard, the build or a hook to let a change through is forbidden (`AGENTS.md`, HARD PROHIBITIONS).

A new guard is added to the table above in the same change.
