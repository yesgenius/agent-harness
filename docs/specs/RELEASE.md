# Release contract

How a new version of this template reaches the people who take it. The `release` skill runs this sequence and stops where the owner's word is needed.

## What the user gets

The user clones the repository from GitHub and gets the release branch: it is the default branch there. There is no separate package: the released version is the commit the release branch on GitHub points at. So publishing the template is pushing the release branch.

The example in `example/` is released only as part of the template. It has no users of its own.

## Branches

- Development branch: `developmentBranch` from `harness.config.json`. Daily work happens here, and the `push` skill pushes it.
- Release branch: `releaseBranch` from the same file. It answers the question of what someone who clones the template gets right now. It moves only by fast-forward from the development branch and only with the declared intent `RELEASE_INTENT=1`.

Without the declared intent, the hook `.githooks/pre-commit` refuses a `git commit` on the release branch, and `.githooks/pre-push` refuses a push to it. A commit created by a merge, a `cherry-pick` or a `revert` is not seen by the first hook: the push stops such a mistake. The hooks stand against a mistake, not against a decision: `--no-verify` bypasses them. Branch protection on GitHub is not part of this contract.

## Sequence

1. On the development branch the `version` field in `package.json` is raised for the new release, and the edit is committed by the `commit` procedure. The owner starts it by naming it. The commit that raises the version is the last commit of the release. A change committed after it, even a one-line fix asked for during the release, belongs to the next version: the version is raised again, so a tag never names a state the version number does not describe.
2. `npm run verify` is green. It ends with the check `scripts/check-clean-tree.js`: any difference from the last commit, a new file someone forgot to add included, fails it and is named by its path. The run on the fixtures from `docs/specs/REGRESSION.md` has passed.
3. A report to the owner in the language of behavior: what changed for someone who takes the template, and what the run showed. Nothing leaves the machine before the owner's word.
4. After the owner's word: the release branch is fast-forwarded to the development branch and pushed with `RELEASE_INTENT=1`. That push is the publication. The owner's word is given for this release, not for releases in general.
5. The full hash of the released commit is written into the report.
6. The owner opens the repository on GitHub and confirms that the release branch points at that commit.
7. After the confirmation that commit gets the tag `v` plus `version` from `package.json`, for example `v1.0.0`, and the tag is pushed.
8. The working copy returns to the development branch.

## Rollback

The history of the release branch is not rewritten. A force push is a destructive git operation: without the owner's confirmation the agent does not perform it (`AGENTS.md`, section Autonomy and approval). The settings of both agents also refuse a command that starts with `git push --force` or `git push -f`; other spellings of the same push they do not recognize. If a release turns out broken, the fix is an ordinary task on the development branch and ships as a new release by the same sequence. If it cannot be fixed quickly, the breaking commits are reverted with `git revert` on the development branch, and that too ships as a new release.
