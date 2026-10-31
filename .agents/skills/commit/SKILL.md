---
name: commit
description: >-
  Explicitly run the repository commit workflow: build, run tests, stage the
  change and read it, write a conventional commit message, then commit and
  stop. Nothing is pushed. Use only when the user clearly wants the work
  committed without a push. Do not trigger implicitly for ordinary coding or
  review tasks.
---

# Commit Workflow

Execute this workflow only after the user explicitly asks for it. It commits the current work and pushes nothing. It never checks out, merges or pushes any branch.

## Procedure

### Step 0: Build

Run `npm run build`. If the build fails, stop and report the failure.

### Step 1: Run tests

Run `npm test`. If tests fail, rerun each failed test in isolation. Stop only if an isolated rerun still fails.

### Step 2: Stage and read the change

```sh
git status --short --untracked-files=all
```

Only an empty status means `Nothing to commit`; then stop.

The commit takes every change the status lists, unless the user named a narrower scope. Stage the full scope with `git add .`, or only the named paths with `git add -- <path>...`. Then read what is staged:

```sh
git diff --staged --name-status
git diff --staged
```

Stop and ask, leaving the index as it is, when:

- the staged names include a path outside the scope, or miss one inside it;
- the staged content carries what looks like a credential: a token, key, password, cookie or session identifier.

Do not unstage, edit or delete files, and do not change ignore rules, to make either condition pass: what belongs in the commit is the user's call.

### Step 3: Write the message

Use a conventional commit message: `<type>(<scope>): <subject>`, with `feat`, `fix`, `docs`, `refactor`, `test`, `build` or `chore`. The subject says what changed for a user or a maintainer, not which files moved.

### Step 4: Commit

```sh
git commit -m "<message>"
```

If a hook refuses the commit, stop and report what it said. Never pass `--no-verify`.

## Output

Report the final commit message and the final `git status --short`.
