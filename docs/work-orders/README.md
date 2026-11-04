# Work orders

This folder holds work orders for the agent, one file per job. The template is `docs/WORK-ORDER-TEMPLATE.md`.

- A work order is written by the owner, or by the agent at the owner's request. What counts as done is decided by the owner.
- A work order may be in any language the owner writes in; the rest of the repository is in English.
- A work order is a working material, not a source of truth. How the product must work is written in `docs/specs/`.
- A work order describes a change: what will be different in the product. Everything it changes, the agent also brings into the specifications in the same job. If a work order disagrees with a specification where it does not announce a change, the agent stops and asks the owner instead of choosing itself.
- The folder is kept in git: on another machine and a month later you can see what was asked.
- The agent that runs a work order does not edit it. Changing a work order is the owner's decision.
- A work order does not name third-party services and does not describe their current behavior: it lives in git, and such observations live only in logs and `docs/temp/`. A work order refers to them by path.
- The agent's report lives in `docs/temp/` under the same name as the work order. That folder does not go into git.
