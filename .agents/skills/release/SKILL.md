---
name: release
description: >-
  Prepare and advance a release under the repository release contract. Use when
  the product asks to prepare a release; require explicit publication
  authorization before any external write, and leave the final publication step
  to a person.
---

# Release

Use the release contract in `docs/specs/RELEASE.md`. If that specification is absent or incomplete, stop and report the missing contract instead of inventing a release sequence.

Prepare and verify the release locally first. Do not push, create a tag or make any other external write until the product has explicitly authorized this release.

After that authorization:

1. Advance the release branch by fast-forward only: `git merge --ff-only`. A merge commit would put a state on the release branch that the development branch never held.
2. Every commit or push on the release branch declares the barrier intent, for example `RELEASE_INTENT=1 git push origin <releaseBranch>`.
3. Build and verify the release artifact, hand it to the product, and record the full commit it was built from.
4. Stop until the product confirms that this exact artifact was published.
5. Only after that confirmation, tag the commit recorded in step 3 and push the tag.
6. Return the working copy to the development branch and name in the report the branch it was left on. The next ordinary task starts from there.

Report every command and result, the artifact identity, the commit it was built from and the branch the working copy was left on.
