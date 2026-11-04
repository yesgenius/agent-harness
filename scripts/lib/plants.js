/**
 * @file The violations the harness must catch. Each one breaks a rule the way an agent or a
 * person really would. `scripts/demo-guards.js` shows them to a human, and a guard runs them.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const GUARDS = 'tests/guards';
const EXAMPLE_GUARDS = 'example/tests/guards';
const EXAMPLE = 'example';

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
    story: 'Агент заводит вторую копию инструкций',
    path: 'CLAUDE.md',
    create: 'Same rules, one more copy.\n',
    guard: `${GUARDS}/both-front-ends-share-one-instruction-file.test.js`,
  },
  {
    story: 'Агент кладёт вторую инструкцию в папку с кодом',
    path: 'app/AGENTS.md',
    create: 'Rules for this folder only.\n',
    guard: `${GUARDS}/both-front-ends-share-one-instruction-file.test.js`,
  },
  {
    story: 'В один из двух агентов добавили шаг, во второй забыли',
    path: '.agents/skills/commit/SKILL.md',
    edit: (text) => swap(text, '### Step 0: Build', '### Step 0: Build\n\nSkip this when in a hurry.'),
    guard: `${GUARDS}/both-front-ends-offer-the-same-workflows.test.js`,
  },
  {
    story: 'Запрет опасной команды убрали только у одного агента',
    path: '.claude/settings.json',
    edit: (text) => swap(text, '      "Bash(git reset --hard *)",\n', ''),
    guard: `${GUARDS}/both-front-ends-apply-the-same-settings.test.js`,
  },
  {
    story: 'Версию инструмента браузера отвязали от номера',
    path: '.mcp.json',
    edit: (text) => swap(text, 'chrome-devtools-mcp@1.9.0', 'chrome-devtools-mcp@latest'),
    guard: `${GUARDS}/both-front-ends-apply-the-same-settings.test.js`,
  },
  {
    story: 'Браузер одного агента запускается другой командой',
    path: '.mcp.json',
    edit: (text) => swap(text, '"command": "npx"', '"command": "bunx"'),
    guard: `${GUARDS}/both-front-ends-apply-the-same-settings.test.js`,
  },
  {
    story: 'Барьер выглядит на месте, но больше не отказывает',
    path: '.githooks/pre-push',
    edit: (text) => swap(text, 'exit "$REFUSED_EXIT"', 'exit "$ALLOWED_EXIT"'),
    guard: `${GUARDS}/the-push-barrier-guards-the-declared-release-branch.test.js`,
  },
  {
    story: 'Скилл проверяет объявленную ветку, а пушит записанную от руки',
    path: '.claude/skills/push/SKILL.md',
    edit: (text, root) => {
      const { developmentBranch } = JSON.parse(readFileSync(join(root, 'harness.config.json'), 'utf8'));
      return swap(text, 'git push origin <developmentBranch>', `git push origin ${developmentBranch}`);
    },
    guard: `${GUARDS}/the-push-barrier-guards-the-declared-release-branch.test.js`,
  },
  {
    story: 'Проверка перед выпуском снова не видит забытый новый файл',
    path: 'package.json',
    edit: (text) => swap(text, '&& npm run tree:clean"', '&& git diff --exit-code"'),
    guard: `${GUARDS}/verify-refuses-a-tree-with-uncommitted-work.test.js`,
  },
  {
    story: 'Проверка узнаёт свой запуск по пути: через ссылку она молча пропускается',
    path: 'scripts/check-clean-tree.js',
    edit: (text) => swap(text, 'if (isMain(import.meta)) {', 'if (import.meta.url === `file://${process.argv[1]}`) {'),
    guard: `${GUARDS}/a-check-started-through-a-link-still-runs.test.js`,
  },
  {
    story: 'В другой скрипт вернули самодельную проверку запуска',
    path: 'scripts/fsm/fsm-log-prefixes.js',
    edit: (text) => swap(
      swap(text, "import { readFileSync } from 'node:fs';\n", "import { readFileSync } from 'node:fs';\nimport { pathToFileURL } from 'node:url';\n"),
      'if (isMain(import.meta)) {',
      'if (import.meta.url === pathToFileURL(process.argv[1]).href) {',
    ),
    guard: `${GUARDS}/a-check-started-through-a-link-still-runs.test.js`,
  },
  {
    story: 'Проверку запуска переписали новой записью, через ссылку она снова пропускается',
    path: 'scripts/check-console-routing.js',
    edit: (text) => swap(text, 'if (isMain(import.meta)) {', 'if (import.meta.filename === process.argv.at(1)) {'),
    guard: `${GUARDS}/a-check-started-through-a-link-still-runs.test.js`,
  },
  {
    story: 'Проверка читает признак запуска сама: на старом Node она молча пропускается',
    path: 'scripts/check-workstation.js',
    edit: (text) => swap(text, 'if (isMain(import.meta)) {', 'if (import.meta.main) {'),
    guard: `${GUARDS}/a-check-started-through-a-link-still-runs.test.js`,
  },
  {
    story: 'Спецификацию переименовали, ссылка в инструкции осталась',
    path: 'AGENTS.md',
    edit: (text) => swap(text, 'docs/specs/RELEASE.md', 'docs/specs/RELEASES.md'),
    guard: `${GUARDS}/a-spec-reference-points-at-the-source-of-truth.test.js`,
  },
  {
    story: 'Спецификацию поправили, индекс не пересобрали',
    path: 'docs/specs/RELEASE.md',
    edit: (text) => `# Новый раздел\n\n${text}`,
    guard: `${GUARDS}/the-index-matches-the-specs.test.js`,
  },
  {
    story: 'Прямой вызов консоли мимо единого журнала',
    path: `${EXAMPLE}/src/dispatch.js`,
    needs: EXAMPLE,
    edit: (text) => swap(text, "const logger = createLogger('Dispatch');", "const logger = createLogger('Dispatch');\nconsole.log('debug');"),
    guard: `${GUARDS}/console-access-single-sink.test.js`,
  },
  {
    story: 'Вызов консоли спрятали внутрь шаблонной строки',
    path: `${EXAMPLE}/src/dispatch.js`,
    needs: EXAMPLE,
    edit: (text) => swap(text, "const logger = createLogger('Dispatch');", "const logger = createLogger(`Dispatch${console.info('debug') ?? ''}`);"),
    guard: `${GUARDS}/console-access-single-sink.test.js`,
  },
  {
    story: 'Проверка перестала видеть файлы и поэтому стала зелёной',
    path: 'harness.config.json',
    needs: EXAMPLE,
    edit: (text) => swap(text, '"sourceRoots": [\n      "example/src"', '"sourceRoots": [\n      "example/nothing"'),
    guard: `${GUARDS}/console-access-single-sink.test.js`,
  },
  {
    story: 'Переход переименовали в коде, в модели он остался старым',
    path: `${EXAMPLE}/src/dispatch.js`,
    needs: EXAMPLE,
    edit: (text) => swap(text, '[reminder.send-started]', '[reminder.sending]'),
    guard: `${GUARDS}/every-transition-log-matches-the-process-model.test.js`,
  },
  {
    story: 'Вызов лога закомментировали, префикс остался в файле',
    path: `${EXAMPLE}/src/dispatch.js`,
    needs: EXAMPLE,
    edit: (text) => swap(text, '  logger.info(`[reminder.send-started]', '  // logger.info(`[reminder.send-started]'),
    guard: `${GUARDS}/every-transition-log-matches-the-process-model.test.js`,
  },
  {
    story: 'Вызов лога заменили строкой с тем же текстом',
    path: `${EXAMPLE}/src/dispatch.js`,
    needs: EXAMPLE,
    edit: (text) => swap(text, '  logger.info(`[reminder.send-started] ${reminder.id}`);', "  void 'logger.info(`[reminder.send-started]`)';"),
    guard: `${GUARDS}/every-transition-log-matches-the-process-model.test.js`,
  },
  {
    story: 'В модели необратимый шаг поставили раньше надёжной записи',
    path: `${EXAMPLE}/process/reminder.fsm.json`,
    needs: EXAMPLE,
    edit: (text) => swap(text, '"from": "intent-recorded", "to": "sending"', '"from": "idle", "to": "sending"'),
    guard: `${GUARDS}/every-transition-log-matches-the-process-model.test.js`,
  },
  {
    story: 'Страницу-образец удалили, сценарий остался',
    path: 'docs/specs/REGRESSION.md',
    needs: EXAMPLE,
    edit: (text) => swap(text, '`delivered.html`', '`delivered-old.html`'),
    guard: `${GUARDS}/every-regression-scenario-resolves-to-a-fixture-and-a-rule.test.js`,
  },
  {
    story: 'Шаг выкинули из сборки, она стала быстрее и зелёной',
    path: 'package.json',
    edit: (text) => swap(text, 'npm run code:syntax && ', ''),
    guard: `${GUARDS}/the-build-keeps-every-gate.test.js`,
    only: 'the build refuses what code:syntax checks',
  },
  {
    story: 'Команду проверки заменили пустышкой, имя шага осталось',
    path: 'package.json',
    edit: (text) => swap(text, '"code:syntax": "node scripts/check-syntax.js"', '"code:syntax": "echo skipped"'),
    guard: `${GUARDS}/the-build-keeps-every-gate.test.js`,
    only: 'the build refuses what code:syntax checks',
  },
  {
    story: 'Из конфигурации убрали все папки проверки синтаксиса',
    path: 'harness.config.json',
    edit: (text) => text.replace(/"syntaxRoots": \[[^\]]*\]/, '"syntaxRoots": []'),
    guard: `${GUARDS}/the-build-keeps-every-gate.test.js`,
    only: 'a clean copy builds',
  },
  {
    story: 'Скилл сам выставляет автора коммита',
    path: '.claude/skills/commit/SKILL.md',
    edit: (text) => swap(text, 'git commit -m "<message>"', 'git commit --author="Agent <a@b>" -m "<message>"'),
    guard: `${GUARDS}/the-commit-identity-has-one-source.test.js`,
  },
  {
    story: 'Скилл показывает содержимое коммита до проверки на секреты',
    path: '.claude/skills/commit/SKILL.md',
    edit: (text) => swap(text, 'npm run --silent secrets:staged\n', ''),
    guard: `${GUARDS}/a-staged-secret-is-reported-without-its-value.test.js`,
  },
  {
    story: 'Сторож без объяснения, что он защищает',
    path: 'tests/guards/a-test-with-no-reason-at-all.test.js',
    create: "import { test } from 'node:test';\ntest('passes', () => {});\n",
    guard: `${GUARDS}/every-guard-states-its-rule.test.js`,
  },
  {
    story: 'Сторожа добавили, в реестр не внесли',
    path: 'tests/guards/a-guard-nobody-listed-in-the-register.test.js',
    create: "/**\n * @file A guard nobody listed in the register.\n *\n * Its rule is stated here and nowhere a person would look it up.\n * It passes, so only the register check can notice it.\n */\nimport { test } from 'node:test';\ntest('passes', () => {});\n",
    guard: `${GUARDS}/every-guard-states-its-rule.test.js`,
  },
  {
    story: 'Сторожа удалили, строка в реестре осталась',
    path: 'docs/specs/GUARDS.md',
    edit: (text) => swap(
      text,
      '| --- | --- | --- | --- |\n',
      '| --- | --- | --- | --- |\n| `a-guard-deleted-long-ago` | Правило, которое уже никто не проверяет | Человек верит строке реестра | 1 |\n',
    ),
    guard: `${GUARDS}/every-guard-states-its-rule.test.js`,
  },
  {
    story: 'Реестр обещает намеренную поломку, которой нет',
    path: 'docs/specs/GUARDS.md',
    edit: (text) => text.replace(
      /(\| `every-guard-states-its-rule` \|.*\| )(\d+)( \|)/,
      (row, start, count, end) => `${start}${Number(count) + 1}${end}`,
    ),
    guard: `${GUARDS}/every-guard-states-its-rule.test.js`,
  },
  {
    story: 'Константу увеличили, обычные тесты этого не замечают',
    path: `${EXAMPLE}/src/constants.js`,
    needs: EXAMPLE,
    edit: (text) => swap(text, 'PROVIDER_CONFIG_REFRESH_MS = 3_600_000', 'PROVIDER_CONFIG_REFRESH_MS = 7_200_000'),
    guard: `${EXAMPLE_GUARDS}/a-published-provider-fix-reaches-a-user-within-an-hour.test.js`,
  },
  {
    story: 'Константа цела, но конфигурация больше никогда не устаревает',
    path: `${EXAMPLE}/src/provider-config.js`,
    needs: EXAMPLE,
    edit: (text) => swap(text, 'return now - fetchedAt >= PROVIDER_CONFIG_REFRESH_MS;', 'return false;'),
    guard: `${EXAMPLE_GUARDS}/a-published-provider-fix-reaches-a-user-within-an-hour.test.js`,
  },
  {
    story: 'Две строки поменяли местами: отправка раньше записи',
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
    story: 'Имя внешнего сервиса попало в код',
    path: `${EXAMPLE}/src/dispatch.js`,
    needs: EXAMPLE,
    edit: (text, root) => {
      const { providers } = JSON.parse(readFileSync(join(root, EXAMPLE, 'config/providers.json'), 'utf8'));
      return `// ${providers[0].name} drops long texts.\n${text}`;
    },
    guard: `${EXAMPLE_GUARDS}/no-provider-name-outlives-the-provider-config.test.js`,
  },
];
