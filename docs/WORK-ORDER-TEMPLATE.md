# A work order for the agent

A work order describes the result in the language of behavior. The agent decides how to do it; you decide what counts as done. Fill it in and put it into `docs/work-orders/`: a launch under a goal points at this file. The rules of that folder are in `docs/work-orders/README.md`. Without a goal a work order can be pasted straight into the conversation, but then it does not stay in git.

```markdown
# Work order: <what must become possible>

## Why
<Who will be able to do what after this job. One or two sentences.>

## What must be visible
1. I open <what>, I do <what> — I see <what>.
2. When <special case>, I see <what>, not <what>.

## What must not happen
- <Something that works now and must not break.>

## Specifications
- Bring `docs/specs/` in line with the new behavior in this same job: <which sections are affected, if known>.

## Boundaries
- Do not touch: <what>.
- Ask me before: <what>.

## Report
File: docs/temp/<work-order>.md, with the same name as the work order. Section "What was verified": every item of "What must be visible",
how it was checked, what was observed. Section "Changed guards": the output of
`git status --short --untracked-files=all -- tests/guards example/tests/guards scripts .githooks package.json harness.config.json .claude/settings.json .codex .mcp.json docs/specs/GUARDS.md`
(guards, planted violations, build checks, hooks, agent deny rules and everything the guards read their rules from)
and for each file in it: which rule is now checked differently, and why. An empty output means the section holds one word: "none".
At the end, the manual check: what to open, what to do, what correct looks like, which log filter to capture if it does not.
```

The launch under a goal, the same for both agents. The owner pastes the line: the agent does not set a goal for itself.

```text
/goal Run the work order docs/work-orders/<work-order>.md. Done when: the agent has printed into this conversation the sections "What was verified" and "Changed guards" of the report docs/temp/<work-order>.md, the first naming every criterion of the work order with what confirms it, the second listing the changed guards or saying "none"; and the last runs of npm run build and npm test in this conversation succeeded; or the agent has printed into the conversation a question to the product that the work cannot continue without, and stopped; or 200 turns have passed. In its last message the agent names the exit: "done", "answer needed" or "not finished: 200 turns passed"; for the last two it lists what is not done and what is needed to continue.
```

What matters here:

- A work order starts on a clean tree: everything earlier is committed. Then after the job `git status --short docs/specs/` names every changed and new specification file of this work order, and `git diff docs/specs/` shows the edits to files that existed before; it does not show a new file, so open that one whole. Read these changes before the manual check: they show what the job changed in the description of the product. If something there is wrong or unclear, send your questions back to the agent.

- The "Changed guards" section closes a hole the guards cannot see: the agent may weaken a guard itself, and the build stays green. Only a person can notice that. If the section does not say "none", read the explanation before the manual check: a rule that changed without your decision is a reason to send the work back.

- The confirmation is printed into the conversation. In Claude Code the condition is judged by a separate model, which sees only the conversation and reads no files. In Codex the agent itself checks the condition.
- The condition has three exits. Without a question to the product the agent will guess instead of asking; without a turn limit it may never stop. The goal is met only by the first exit: the other two stop the work but do not finish it, so the agent names the exit and lists what is not done.
- The goal text is at most 4000 characters, so the details live in the work order, not in the launch line.
- The criteria are written so they can be checked without reading code.
