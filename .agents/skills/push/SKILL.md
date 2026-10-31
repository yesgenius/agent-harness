---
name: push
description: >-
  Explicitly run the repository push workflow on the development branch only:
  build, run tests, stage and read the change, write a conventional commit
  message, commit, then push the development branch. Use only when the user
  clearly wants the commit-and-push workflow. Do not trigger implicitly for
  ordinary coding or review tasks.
---

# Push Workflow

Execute this workflow only after the user explicitly asks for it. It pushes only the development branch. It never checks out, merges or pushes the release branch.

## Procedure

### Step 0: Confirm the branch

```sh
git branch --show-current
```

The branch must be the `developmentBranch` of `harness.config.json`. If it is anything else, stop and report it.

### Step 1: Build

Run `npm run build`. If the build fails, stop and report the failure.

### Step 2: Run tests

Run `npm test`. If tests fail, rerun each failed test in isolation. Stop only if an isolated rerun still fails.

### Step 3: Stage and read the change

```sh
git status --short --untracked-files=all
```

An empty status means there is nothing to commit: skip to Step 5, which pushes commits already made.

The commit takes every change the status lists, unless the user named a narrower scope. Stage with `git add .` or `git add -- <path>...`, then read `git diff --staged --name-status` and `git diff --staged`.

Stop and ask, leaving the index as it is, when the staged names include a path outside the scope or miss one inside it, or when the staged content carries what looks like a credential. Do not change anything to make either condition pass.

### Step 4: Commit

Use a conventional commit message: `<type>(<scope>): <subject>`. Never pass `--no-verify`.

### Step 5: Push and verify

```sh
git log --oneline origin/dev..dev
```

These are the commits the push will send. If the list is empty, report `Nothing to push` and stop.

Run these commands sequentially, never chained with `&&`:

```sh
git push origin dev
git status --short --branch --untracked-files=all
```

The final status shows the branch neither ahead of nor behind the remote. If it shows anything else, stop and report it. If any command fails, stop and report the error. Never force a push.

## Output

Report the final commit message, the commits sent, the push result and the final status.
