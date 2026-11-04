# Getting started

This path sets up an empty computer for development with a coding agent and puts a working example next to it. You do not need to read code: the agent explains the example to you.

## What you need

- A computer with Windows or macOS.
- A Claude or a ChatGPT subscription. One is enough: the harness works with either agent.
- The Claude desktop app (the Claude Code agent is its Code tab) or the ChatGPT desktop app (the Codex agent is its Codex section). If one of them is already installed, there is nothing to install.

You do not need a GitHub account for steps 1–3: the template is public and downloads without signing in. You need one only when you want to send your own work to GitHub.

## Confirmations are a separate decision

The template is set up to work without confirmations: its settings let the agent run programs without asking, otherwise you cannot hand over a work order and walk away. These settings take effect as soon as you open the example in VS Code (step 2). Use this mode only under a separate user account of the computer, one that holds none of your personal files, passwords or access keys. A separate user does not limit what the accounts the agent is signed into may do. The prompt of step 1 asks whether to keep confirmations in the example. If you work under your usual user account, answer "keep".

## Step 1. Prepare the computer with one prompt

1. Open the agent's desktop app. If you have none, install one and sign in:
   - Claude Code: the Claude desktop app, Code tab;
   - Codex: the ChatGPT desktop app, Codex section.
2. Windows and Claude Code only: if git is not installed yet, install Git for Windows from https://git-scm.com/downloads/win before you open the Code tab for the first time, then restart the app. The Code tab does not work without it.
3. Create an empty folder, for example `harness-lab` in Documents, and choose it in the app as the project folder.
4. Paste the prompt below as it is. The agent talks to you in the language you write your own messages in, not in the language of the prompt.

```text
Talk to me in the language of my own messages. This prompt is copied from an English guide,
so its language does not count. Until I write something of my own, use the language of this
computer's interface.

Prepare this computer for development with an agent in VS Code and set up, in the current
folder, the example: the template https://github.com/yesgenius/agent-harness. I am not a
developer: explain in plain words what you install and why.

First find out yourself, without asking me, and show as a short list:
- which system this is, Windows or macOS, and whether I have administrator rights;
- which agent you are: Claude Code or Codex;
- what is already installed: VS Code and the agent extensions in it, git, Node.js, Google Chrome.

Then install only what is missing. After each installation, check its version.
1. Git.
2. Node.js of the major version written in the template's .nvmrc file. The template is not
   downloaded yet, so read the file here:
   https://raw.githubusercontent.com/yesgenius/agent-harness/main/.nvmrc
   Install it through nvm (on Windows: nvm-windows) and make it the version new shells start
   with. If Node.js is already installed in another version, install the needed one next to
   it, not over it.
3. Google Chrome: the agent checks the product in it.
4. VS Code.
5. The VS Code extension of the agent you are working in now. Check in its maker's official
   documentation whether it works on my system and what it needs. If it needs extra
   preparation, do it. If the extension works poorly on my system, stop, explain the
   difference and suggest the other agent's extension. Do not install the second extension
   without my word.
6. The git commit author, if it is not set yet. Ask me for the name and email.

Then set up the example.
7. Download the template into the agent-harness subfolder of the current folder and install
   everything it needs. If that subfolder already exists, change nothing in it and ask me.
8. Ask me whether to keep command confirmations in the example. The template is set up so
   that the agent runs programs without asking. If I answer "keep", change the settings of
   both agents in the downloaded copy so that they ask before commands.
9. Open the agent-harness folder in VS Code.

How to work:
- Install only from official sites and official package managers.
- If I have no administrator rights, install what can be installed for one user. Name what
  cannot be installed without the rights and stop.
- If my action is needed (click "Install", type the computer password, sign in to an
  account), stop and write exactly what to do and where. Do not try to sign in for me.
- If an installation fails, find the cause and try another official way. If that fails too,
  stop and describe what happened.
- Delete nothing. Do not update or reinstall programs that were already installed.
- If the work is interrupted, I will send this prompt again: start by checking what is
  already installed.

At the end give me:
- a table: program, version, how it was checked;
- the path to the example folder;
- what I do in VS Code: where to open the agent's panel and how to sign in there.
```

The agent will stop and ask you for actions: allow a command to run, click "Install", type the computer password, answer a question. Do what it asks and write "done" in the chat. The correct result is a table where every program has a version, and VS Code open with the example folder. If the work was interrupted, paste the same prompt again: the agent starts from what is already installed. You will not need the agent's desktop app after this; the work goes on in VS Code.

When you need to send work to GitHub, create a separate account for experiments: the agent signs in to it and gets the right to push to all of its repositories. The agent helps you connect it if you say: "Install GitHub CLI, sign in through it to my GitHub account and connect git to it. Set the commit author email to the number+login@users.noreply.github.com form, so my email does not get into the public history."

## Step 2. Watch it break

In VS Code open the agent's panel and sign in: where it is, the agent wrote at the end of step 1. If VS Code or the agent asks whether you trust this folder, answer "yes": that is how the agent gets the template's settings. Then paste into the extension's chat:

```text
Talk to me in the language of my own messages. This prompt is copied from an English guide,
so its language does not count. Until I write something of my own, use the language of this
computer's interface.

Run the demo:guards demonstration of this template. Show the whole output and explain each
line in terms of behavior: what would have happened to the user.
```

The agent shows every planted violation and explains what would have happened to the user, not what is written in the code. Ask about the example in the same chat: "show me the guard that caught the third violation", "what happens if this check is removed". If you come back another day, open the example folder in VS Code and start a new chat. The agent does not remember the previous conversation, but the example is in front of it.

## Step 3. Move it into your project

The template is not copied whole. Each layer stops one mistake and is needed only where that mistake is possible. The order:

1. **Product description.** The agent reads your code and asks you about the product: what in it cannot be undone, which external services it depends on, how a new version reaches users. The answers are your main work: the agent does not know what is costly for you.
2. **Choice of layers.** From that description the agent decides, layer by layer, whether its mistake is possible in your product. You approve the list. You can start with three: one instruction file, a build before every task, a barrier on the release branch.
3. **Transfer.** The agent moves only the approved layers and sets the checks up for your code. A check counts as moved only when the agent has broken its rule on purpose and shown that it failed.
4. **Growth.** From then on the harness grows from your breakages: something broke and the checks stayed silent — ask the agent to add a guard that catches it and to show that the guard fails.

The detailed order is written in `docs/SKELETON.md`, section "Moving it into your project". Tell the agent:

```text
Talk to me in the language of my own messages. This prompt is copied from an English guide,
so its language does not count. Until I write something of my own, use the language of this
computer's interface.

Move the harness from https://github.com/yesgenius/agent-harness into my project following
the section "Moving it into your project" of docs/SKELETON.md. Ask me one question at a time,
in terms of what the user sees. Before moving anything, show the list of layers and stop.
```
