---
name: resume-here
description: >-
  Explicitly continue on this machine the work pushed from another one, on a
  fresh clone or an older checkout. Stops before anything that exists only here
  could be lost. Commits and pushes nothing and discards no work. Use only when
  the user asks to continue here.
---

# Resume Here

Execute this workflow only after the user explicitly asks for it. The goal is to leave this workstation on the newest pushed state of the development branch, able to build and test it, without losing anything that exists only on this machine.

## Never

- Never commit, push, merge with a merge commit, rebase, reset or amend. Never run `git clean`, `git restore`, `git stash drop` or anything with `--force`.
- Never delete, move or edit a file. Work that exists only on this machine is reported and left where it is.
- Never read or print a secret. Presence is checked; values are never shown.
- Never install system software. Report what is missing and the remedy; installing it is the user's.

## Procedure

### Step 1: Read what exists only on this machine

```sh
git status --short --branch --untracked-files=all
git stash list
git log --oneline --branches --not --remotes
```

If any of these shows work, report it. Continue only if the next steps cannot touch it.

### Step 2: Fetch

Run `git fetch origin`.

### Step 3: Move the development branch

Switch to the `developmentBranch` of `harness.config.json` and advance it with `git merge --ff-only origin/<branch>`. If that refuses, stop and report the divergence: resolving it is the user's call.

### Step 4: Make the workstation whole

Run `npm install`, then `npm run workstation:check`. Report each failure with its remedy.

### Step 5: Rebuild and test

Run `npm run build` and `npm test`. If the build changes a tracked file, report it as drift: the machine that pushed did not rebuild.

## Output

Report the branch, its newest commit, what exists only on this machine, and the build and test results.
