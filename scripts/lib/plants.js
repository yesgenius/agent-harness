/**
 * @file The violations the harness must catch. Each one breaks a rule the way an agent or a
 * person really would. `scripts/demo-guards.js` shows them to a human, and a guard runs them.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const GUARDS = 'tests/guards';
const EXAMPLE_GUARDS = 'example/tests/guards';
const EXAMPLE = 'example';
// A sentence in a language other than English, written as escapes so this file itself stays in English.
const NON_ENGLISH_SENTENCE = '\u0412\u044b\u043f\u0443\u0441\u043a \u0434\u0435\u043b\u0430\u0435\u0442 \u0432\u043b\u0430\u0434\u0435\u043b\u0435\u0446.';
const NON_ENGLISH_WORD = '\u041f\u0420\u041e\u041f\u0423\u0429\u0415\u041d\u041e';

/**
 * Replaces text that must be present, so a plant can never silently change nothing.
 * @param {string} text File text.
 * @param {string} from Text to replace.
 * @param {string} to Replacement.
 * @returns {string} Changed text.
 */
function swap(text, from, to) {
  if (!text.includes(from)) throw new Error(`Plant target is gone: ${from}`);
  return text.replace(from, to);
}

/**
 * Swaps two lines of a file.
 * @param {string} text File text.
 * @param {string} first Text of the earlier block.
 * @param {string} second Text of the later block.
 * @returns {string} Changed text.
 */
function reorder(text, first, second) {
  return swap(swap(text, first, '\u0000'), second, first).replace('\u0000', second);
}

/** Every planted violation, in the order they are shown. */
export const PLANTS = [
  {
    story: 'The agent creates a second copy of the instructions',
    path: 'CLAUDE.md',
    create: 'Same rules, one more copy.\n',
    guard: `${GUARDS}/both-front-ends-share-one-instruction-file.test.js`,
  },
  {
    story: 'The agent puts a second instruction file into a code folder',
    path: 'app/AGENTS.md',
    create: 'Rules for this folder only.\n',
    guard: `${GUARDS}/both-front-ends-share-one-instruction-file.test.js`,
  },
  {
    story: 'A step was added to one of the two agents and forgotten in the other',
    path: '.agents/skills/commit/SKILL.md',
    edit: (text) => swap(text, '### Step 0: Build', '### Step 0: Build\n\nSkip this when in a hurry.'),
    guard: `${GUARDS}/both-front-ends-offer-the-same-workflows.test.js`,
  },
  {
    story: 'A dangerous-command ban was removed from one agent only',
    path: '.claude/settings.json',
    edit: (text) => swap(text, '      "Bash(git reset --hard *)",\n', ''),
    guard: `${GUARDS}/both-front-ends-apply-the-same-settings.test.js`,
  },
  {
    story: 'The browser tool version was unpinned',
    path: '.mcp.json',
    edit: (text) => swap(text, 'chrome-devtools-mcp@1.9.0', 'chrome-devtools-mcp@latest'),
    guard: `${GUARDS}/both-front-ends-apply-the-same-settings.test.js`,
  },
  {
    story: "One agent's browser starts with a different command",
    path: '.mcp.json',
    edit: (text) => swap(text, '"command": "npx"', '"command": "bunx"'),
    guard: `${GUARDS}/both-front-ends-apply-the-same-settings.test.js`,
  },
  {
    story: 'The barrier looks in place but no longer refuses',
    path: '.githooks/pre-push',
    edit: (text) => swap(text, 'exit "$REFUSED_EXIT"', 'exit "$ALLOWED_EXIT"'),
    guard: `${GUARDS}/the-push-barrier-guards-the-declared-release-branch.test.js`,
  },
  {
    story: 'The skill checks the declared branch but pushes one typed by hand',
    path: '.claude/skills/push/SKILL.md',
    edit: (text, root) => {
      const { developmentBranch } = JSON.parse(readFileSync(join(root, 'harness.config.json'), 'utf8'));
      return swap(text, 'git push origin <developmentBranch>', `git push origin ${developmentBranch}`);
    },
    guard: `${GUARDS}/the-push-barrier-guards-the-declared-release-branch.test.js`,
  },
  {
    story: 'The pre-release check again misses a forgotten new file',
    path: 'package.json',
    edit: (text) => swap(text, '&& npm run tree:clean"', '&& git diff --exit-code"'),
    guard: `${GUARDS}/verify-refuses-a-tree-with-uncommitted-work.test.js`,
  },
  {
    story: 'A check recognizes its own start by the path: through a link it silently skips itself',
    path: 'scripts/check-clean-tree.js',
    edit: (text) => swap(text, 'if (isMain(import.meta)) {', 'if (import.meta.url === `file://${process.argv[1]}`) {'),
    guard: `${GUARDS}/a-check-started-through-a-link-still-runs.test.js`,
  },
  {
    story: 'A hand-made start check came back in another script',
    path: 'scripts/fsm/fsm-log-prefixes.js',
    edit: (text) => swap(
      swap(text, "import { readFileSync } from 'node:fs';\n", "import { readFileSync } from 'node:fs';\nimport { pathToFileURL } from 'node:url';\n"),
      'if (isMain(import.meta)) {',
      'if (import.meta.url === pathToFileURL(process.argv[1]).href) {',
    ),
    guard: `${GUARDS}/a-check-started-through-a-link-still-runs.test.js`,
  },
  {
    story: 'The start check was rewritten another way, and through a link it skips itself again',
    path: 'scripts/check-console-routing.js',
    edit: (text) => swap(text, 'if (isMain(import.meta)) {', 'if (import.meta.filename === process.argv.at(1)) {'),
    guard: `${GUARDS}/a-check-started-through-a-link-still-runs.test.js`,
  },
  {
    story: 'A check reads the start flag itself: on an old Node it silently skips itself',
    path: 'scripts/check-workstation.js',
    edit: (text) => swap(text, 'if (isMain(import.meta)) {', 'if (import.meta.main) {'),
    guard: `${GUARDS}/a-check-started-through-a-link-still-runs.test.js`,
  },
  {
    story: 'The build stopped on another Node, and the agent pinned the runtime to it',
    path: '.nvmrc',
    edit: (text) => `${Number(text.trim()) + 1}\n`,
    guard: `${GUARDS}/the-runtime-pin-is-a-long-term-support-line.test.js`,
  },
  {
    story: 'The agent wrote a specification in the language of the conversation',
    path: 'docs/specs/RELEASE.md',
    edit: (text) => `${text}\n${NON_ENGLISH_SENTENCE}\n`,
    guard: `${GUARDS}/the-repository-text-stays-in-english.test.js`,
  },
  {
    story: 'A message the demonstration prints was translated for the owner',
    path: 'scripts/demo-guards.js',
    edit: (text) => swap(text, "MISSED: 'MISSED',", `MISSED: '${NON_ENGLISH_WORD}',`),
    guard: `${GUARDS}/the-repository-text-stays-in-english.test.js`,
  },
  {
    story: 'A specification was renamed, the link in the instructions stayed',
    path: 'AGENTS.md',
    edit: (text) => swap(text, 'docs/specs/RELEASE.md', 'docs/specs/RELEASES.md'),
    guard: `${GUARDS}/a-spec-reference-points-at-the-source-of-truth.test.js`,
  },
  {
    story: 'A specification was edited, the index was not rebuilt',
    path: 'docs/specs/RELEASE.md',
    edit: (text) => `# New section\n\n${text}`,
    guard: `${GUARDS}/the-index-matches-the-specs.test.js`,
  },
  {
    story: 'A direct console call bypasses the single log sink',
    path: `${EXAMPLE}/src/dispatch.js`,
    needs: EXAMPLE,
    edit: (text) => swap(text, "const logger = createLogger('Dispatch');", "const logger = createLogger('Dispatch');\nconsole.log('debug');"),
    guard: `${GUARDS}/console-access-single-sink.test.js`,
  },
  {
    story: 'A console call is hidden inside a template string',
    path: `${EXAMPLE}/src/dispatch.js`,
    needs: EXAMPLE,
    edit: (text) => swap(text, "const logger = createLogger('Dispatch');", "const logger = createLogger(`Dispatch${console.info('debug') ?? ''}`);"),
    guard: `${GUARDS}/console-access-single-sink.test.js`,
  },
  {
    story: 'The check stopped seeing files and turned green because of it',
    path: 'harness.config.json',
    needs: EXAMPLE,
    edit: (text) => swap(text, '"sourceRoots": [\n      "example/src"', '"sourceRoots": [\n      "example/nothing"'),
    guard: `${GUARDS}/console-access-single-sink.test.js`,
  },
  {
    story: 'A transition was renamed in the code but kept its old name in the model',
    path: `${EXAMPLE}/src/dispatch.js`,
    needs: EXAMPLE,
    edit: (text) => swap(text, '[reminder.send-started]', '[reminder.sending]'),
    guard: `${GUARDS}/every-transition-log-matches-the-process-model.test.js`,
  },
  {
    story: 'A log call was commented out, the prefix stayed in the file',
    path: `${EXAMPLE}/src/dispatch.js`,
    needs: EXAMPLE,
    edit: (text) => swap(text, '  logger.info(`[reminder.send-started]', '  // logger.info(`[reminder.send-started]'),
    guard: `${GUARDS}/every-transition-log-matches-the-process-model.test.js`,
  },
  {
    story: 'A log call was replaced with a string of the same text',
    path: `${EXAMPLE}/src/dispatch.js`,
    needs: EXAMPLE,
    edit: (text) => swap(text, '  logger.info(`[reminder.send-started] ${reminder.id}`);', "  void 'logger.info(`[reminder.send-started]`)';"),
    guard: `${GUARDS}/every-transition-log-matches-the-process-model.test.js`,
  },
  {
    story: 'In the model the irreversible step was put before the durable record',
    path: `${EXAMPLE}/process/reminder.fsm.json`,
    needs: EXAMPLE,
    edit: (text) => swap(text, '"from": "intent-recorded", "to": "sending"', '"from": "idle", "to": "sending"'),
    guard: `${GUARDS}/every-transition-log-matches-the-process-model.test.js`,
  },
  {
    story: 'A fixture page was deleted, the scenario stayed',
    path: 'docs/specs/REGRESSION.md',
    needs: EXAMPLE,
    edit: (text) => swap(text, '`delivered.html`', '`delivered-old.html`'),
    guard: `${GUARDS}/every-regression-scenario-resolves-to-a-fixture-and-a-rule.test.js`,
  },
  {
    story: 'A step was dropped from the build, and it became faster and green',
    path: 'package.json',
    edit: (text) => swap(text, 'npm run code:syntax && ', ''),
    guard: `${GUARDS}/the-build-keeps-every-gate.test.js`,
    only: 'the build refuses what code:syntax checks',
  },
  {
    story: 'A check command was replaced with a no-op, the step name stayed',
    path: 'package.json',
    edit: (text) => swap(text, '"code:syntax": "node scripts/check-syntax.js"', '"code:syntax": "echo skipped"'),
    guard: `${GUARDS}/the-build-keeps-every-gate.test.js`,
    only: 'the build refuses what code:syntax checks',
  },
  {
    story: 'Every syntax-check folder was removed from the configuration',
    path: 'harness.config.json',
    edit: (text) => text.replace(/"syntaxRoots": \[[^\]]*\]/, '"syntaxRoots": []'),
    guard: `${GUARDS}/the-build-keeps-every-gate.test.js`,
    only: 'a clean copy builds',
  },
  {
    story: 'The skill sets the commit author itself',
    path: '.claude/skills/commit/SKILL.md',
    edit: (text) => swap(text, 'git commit -m "<message>"', 'git commit --author="Agent <a@b>" -m "<message>"'),
    guard: `${GUARDS}/the-commit-identity-has-one-source.test.js`,
  },
  {
    story: 'The skill shows the commit content before the secret scan',
    path: '.claude/skills/commit/SKILL.md',
    edit: (text) => swap(text, 'npm run --silent secrets:staged\n', ''),
    guard: `${GUARDS}/a-staged-secret-is-reported-without-its-value.test.js`,
  },
  {
    story: 'A guard with no explanation of what it protects',
    path: 'tests/guards/a-test-with-no-reason-at-all.test.js',
    create: "import { test } from 'node:test';\ntest('passes', () => {});\n",
    guard: `${GUARDS}/every-guard-states-its-rule.test.js`,
  },
  {
    story: 'A guard was added but not listed in the register',
    path: 'tests/guards/a-guard-nobody-listed-in-the-register.test.js',
    create: "/**\n * @file A guard nobody listed in the register.\n *\n * Its rule is stated here and nowhere a person would look it up.\n * It passes, so only the register check can notice it.\n */\nimport { test } from 'node:test';\ntest('passes', () => {});\n",
    guard: `${GUARDS}/every-guard-states-its-rule.test.js`,
  },
  {
    story: 'A guard was deleted, its register row stayed',
    path: 'docs/specs/GUARDS.md',
    edit: (text) => swap(
      text,
      '| --- | --- | --- | --- |\n',
      '| --- | --- | --- | --- |\n| `a-guard-deleted-long-ago` | A rule nobody checks any more | A person trusts the register row | 1 |\n',
    ),
    guard: `${GUARDS}/every-guard-states-its-rule.test.js`,
  },
  {
    story: 'The register promises a planted violation that does not exist',
    path: 'docs/specs/GUARDS.md',
    edit: (text) => text.replace(
      /(\| `every-guard-states-its-rule` \|.*\| )(\d+)( \|)/,
      (row, start, count, end) => `${start}${Number(count) + 1}${end}`,
    ),
    guard: `${GUARDS}/every-guard-states-its-rule.test.js`,
  },
  {
    story: 'A constant was raised, and ordinary tests do not notice',
    path: `${EXAMPLE}/src/constants.js`,
    needs: EXAMPLE,
    edit: (text) => swap(text, 'PROVIDER_CONFIG_REFRESH_MS = 3_600_000', 'PROVIDER_CONFIG_REFRESH_MS = 7_200_000'),
    guard: `${EXAMPLE_GUARDS}/a-published-provider-fix-reaches-a-user-within-an-hour.test.js`,
  },
  {
    story: 'The constant is intact, but the configuration never goes stale any more',
    path: `${EXAMPLE}/src/provider-config.js`,
    needs: EXAMPLE,
    edit: (text) => swap(text, 'return now - fetchedAt >= PROVIDER_CONFIG_REFRESH_MS;', 'return false;'),
    guard: `${EXAMPLE_GUARDS}/a-published-provider-fix-reaches-a-user-within-an-hour.test.js`,
  },
  {
    story: 'Two lines swapped: the send now runs before the record',
    path: `${EXAMPLE}/src/dispatch.js`,
    needs: EXAMPLE,
    edit: (text) => reorder(
      text,
      '  const claimed = await journal.claimIntent(reminder.id);\n',
      '  const outcome = await transport.send({ endpoint: provider.endpoint, text: reminder.text });\n',
    ),
    guard: `${EXAMPLE_GUARDS}/no-reminder-leaves-before-the-intent-is-recorded.test.js`,
  },
  {
    story: 'The name of an external service got into the code',
    path: `${EXAMPLE}/src/dispatch.js`,
    needs: EXAMPLE,
    edit: (text, root) => {
      const { providers } = JSON.parse(readFileSync(join(root, EXAMPLE, 'config/providers.json'), 'utf8'));
      return `// ${providers[0].name} drops long texts.\n${text}`;
    },
    guard: `${EXAMPLE_GUARDS}/no-provider-name-outlives-the-provider-config.test.js`,
  },
];
