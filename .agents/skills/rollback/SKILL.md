---
name: rollback
description: >-
  Explicitly run the repository rollback workflow: show which uncommitted files
  would be set aside, stash tracked and untracked changes with a timestamped
  message, verify the working tree is clean, and report the stash reference for
  recovery. Use only when the user clearly asks to roll back local uncommitted
  changes.
---

# Rollback Workflow

Execute this workflow only after the user explicitly asks to roll back local uncommitted changes. It preserves recoverability by stashing everything. It undoes only work that has not been committed; it is not a release rollback.

## Procedure

### Step 1: Check status

Run `git status --short`. If the output is empty, stop and report `Working tree is clean, nothing to rollback`.

### Step 2: Show what will be set aside

List every path from step 1 in the report before stashing.

### Step 3: Stash

```sh
git stash push --include-untracked -m "rollback <UTC timestamp>"
```

### Step 4: Verify

Run `git status --short`. It must be empty. Then run `git stash list` and read the reference of the new entry.

## Output

Report the stash reference and how to restore it: `git stash pop <reference>`. Never drop a stash.
