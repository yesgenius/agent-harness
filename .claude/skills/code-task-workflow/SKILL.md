---
name: code-task-workflow
description: >-
  The required sequence for any task that changes files of this repository
  other than working materials: build, locate the relevant specification, stop
  and ask if it is insufficient, implement, then have the diff reviewed by a
  reviewer that did not write it. Use for every ordinary code task.
---

# Code task workflow

Steps 0-3 run before implementation; step 4 is the implementation; step 5 runs before the work is handed over.

## Step 0 — Build

```sh
npm run build
```

If an error occurs, stop. Do not work around a failing build. This step is unconditional, however small the change.

## Step 1 — Read the map

Read `docs/llm_context/README.md`: a short index of every specification.

## Step 2 — Locate the relevant section

Open the relevant `docs/llm_context/index_*.md`, find the section's line numbers, and read only that section of `docs/specs/`. Reading whole specifications defeats the index.

## Step 3 — Verify the information is complete

If the documentation is insufficient, do not guess and do not assume implementation details. Ask specific questions, framed in the language of system behavior.

## Step 4 — Execute

Only after steps 0-3. When a rule of this project was broken and nothing caught it, or the product states a new rule, add a guard in the same change: a test named as the rule, with a planted violation proving it can fail (`docs/specs/GUARDS.md`).

## Step 5 — Independent review before hand-off

Once the change builds and its validation passes, and before it is reported, have the diff reviewed by a reviewer that did not write it.

The review covers only the paths this task changed. Take them from `git status --short --untracked-files=all` and keep the ones this task changed. Never review "all uncommitted changes": the working tree may hold changes that are not this task's.

- Claude Code: invoke the `code-review` skill with the level first and the paths after it: `/code-review high <path> <path> …`.
- Codex: `codex review "Review only these paths: <path> <path> …. Read each change with git diff HEAD -- <path> <path> … and nothing else; for an untracked file in the list, read the file itself. Project rules are in AGENTS.md."`

Fix each confirmed finding and run the validation again. The report names the findings fixed and the ones dismissed, each with its reason. If the review tool is unavailable or cannot be held to the list, stop and say so: a skipped review is reported, never implied.

Review adds to the build, the tests and the manual check; it replaces none of them.
