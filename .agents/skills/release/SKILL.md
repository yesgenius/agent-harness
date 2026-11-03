---
name: release
description: >-
  Prepare and advance a release under the repository release contract. Use when
  the product asks to prepare a release; require explicit publication
  authorization before any external write, and perform only the publication
  steps the contract assigns to the agent.
---

# Release

Use the release contract in `docs/specs/RELEASE.md`. If that specification is absent or incomplete, stop and report the missing contract instead of inventing a release sequence.

Prepare and verify the release locally first. Do not push, create a tag or make any other external write until the product has explicitly authorized this release.

After that authorization:

1. Advance the release branch by fast-forward only: `git merge --ff-only`. A merge commit would put a state on the release branch that the development branch never held.
2. Every commit or push on the release branch declares the barrier intent, for example `RELEASE_INTENT=1 git push origin <releaseBranch>`.
3. Publish exactly as the contract says and record the full commit being released. Where the contract reserves publication for a person, build and verify the release artifact and hand it to the product instead; never perform a step the contract reserves for a person.
4. Stop until the product confirms that users now receive this exact commit, or this exact artifact where the contract has one.
5. Only after that confirmation, tag the commit recorded in step 3 with the tag the contract names and push the tag.
6. Return the working copy to the development branch and name in the report the branch it was left on. The next ordinary task starts from there.

Report every command and result, the commit released, the artifact identity where the contract has one, and the branch the working copy was left on.
