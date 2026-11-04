/**
 * @file A check started through a link still runs.
 *
 * A script that both exports functions and runs as a command must tell which of the two it is
 * doing. Comparing its own URL with the path it was started by looks right and works until the
 * path goes through a link: Node loads the module from its real path, the two differ, and the
 * script exits 0 having checked nothing. A gate that silently skips itself reads as a gate that
 * passed. So every such command is started through a linked directory and must end exactly as it
 * ends when started directly, however its check is spelled. Node answers the question in
 * `import.meta.main`, read only through `isMain`, which refuses on a Node too old to answer; the
 * static scan names the usual hand-made spellings early and covers files no command starts.
 */
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { test } from 'node:test';
import { isMain } from '../../scripts/lib/entry.js';
import { assertFloor, walkFiles } from '../../scripts/lib/scan.js';
import { stripCommentsAndStrings } from '../../scripts/lib/source-text.js';

const PACKAGE_FILE = 'package.json';
const SCRIPTS_DIRECTORY = 'scripts';
// A command `package.json` starts with node, from the scripts directory.
const COMMAND = /\bnode (scripts\/\S+\.js)\b/;
// A module that exports is also imported, so it must tell a start from an import.
const EXPORTS = /^export /m;
const COMMAND_FLOOR = 3;
const SCANNED_DIRECTORIES = ['scripts', 'tests', 'example'];
const SCANNED_EXTENSIONS = ['.js', '.mjs'];
const FILE_FLOOR = 20;
const ENTRY_HELPER = 'scripts/lib/entry.js';
const MAIN_FLAG = /\bimport\.meta\.main\b/;
const LINE_BREAK = '\n';
// Hand-made main checks: the start path read by position, or the module's own path compared.
const START_PATH_CHECKS = [
  /\bargv\s*(?:\?\.)?\[\s*1\s*\]/,
  /\bargv\s*\??\.at\(\s*1\s*\)/,
  /\[\s*,\s*[\w$]+[^\]]*\]\s*=\s*(?:process\.)?argv\b/,
  /import\.meta\.(?:url|filename)\s*[!=]==?|[!=]==?\s*import\.meta\.(?:url|filename)/,
];
const MODULE_PATH = /import\.meta\.(?:url|filename)/;
const START_ARGUMENTS = /\bargv\b/;
const TEMP_PREFIX = 'harness-link-';
const EMPTY_NAME = 'empty';
const REPOSITORY_NAME = 'repository';
const LINK_NAME = 'linked-scripts';
const LINK_TYPE = 'junction';
const GATE_SCRIPT = 'check-clean-tree.js';
const UNTRACKED = 'forgotten.txt';
const UNTRACKED_TEXT = 'not committed\n';
const SUCCESS = 0;
const REFUSED = 1;
const TEXT_ENCODING = 'utf8';
const GIT_INIT = ['init', '-q'];
const GIT_FIRST_COMMIT = ['commit', '-q', '--allow-empty', '--no-verify', '-m', 'start'];
const COMMIT_IDENTITY = ['-c', 'user.name=guard', '-c', 'user.email=guard@example.invalid', '-c', 'commit.gpgsign=false'];
const GIT_ENVIRONMENT = /^GIT_/;
// Stops git at the temp directory, so a command run there never finds a repository above it.
const GIT_CEILING = 'GIT_CEILING_DIRECTORIES';

// A hook or shell that exports GIT_DIR would point every command below at the real repository.
for (const name of Object.keys(process.env)) if (GIT_ENVIRONMENT.test(name)) delete process.env[name];

/**
 * Tells whether code decides it runs as a command by looking at the start path.
 * @param {string} source JavaScript source.
 * @returns {boolean} True when the code, not a comment or a string, holds such a check.
 */
function checksStartPath(source) {
  const code = stripCommentsAndStrings(source);
  if (START_PATH_CHECKS.some((pattern) => pattern.test(code))) return true;
  return code.split(LINE_BREAK).some((line) => MODULE_PATH.test(line) && START_ARGUMENTS.test(line));
}

/**
 * Lists the commands `package.json` starts whose module also exports.
 * @returns {string[]} Script paths relative to the repository root.
 */
function listDualCommands() {
  const { scripts } = JSON.parse(readFileSync(PACKAGE_FILE, TEXT_ENCODING));
  const paths = Object.values(scripts).map((line) => COMMAND.exec(line)?.[1]).filter(Boolean);
  return [...new Set(paths)].filter((path) => EXPORTS.test(readFileSync(path, TEXT_ENCODING)));
}

/**
 * Runs git in a directory and fails the test when git fails.
 * @param {string} directory Working directory.
 * @param {string[]} args Git arguments.
 * @returns {void}
 */
function git(directory, args) {
  const { status, stderr } = spawnSync('git', args, { cwd: directory, encoding: TEXT_ENCODING });
  assert.equal(status, 0, `git ${args.join(' ')}: ${stderr}`);
}

/**
 * Runs a step with a temp directory that holds a link to this repository's scripts.
 * @param {(directory: string, link: string) => void} step What to do.
 * @returns {void}
 */
function withLinkedScripts(step) {
  const directory = mkdtempSync(join(tmpdir(), TEMP_PREFIX));
  try {
    const link = join(directory, LINK_NAME);
    symlinkSync(resolve(SCRIPTS_DIRECTORY), link, LINK_TYPE);
    step(directory, link);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
}

/**
 * Starts a script with node.
 * @param {string} script Script path.
 * @param {string} cwd Working directory.
 * @returns {{status: number, stderr: string}} How it ended.
 */
function start(script, cwd) {
  const env = { ...process.env, [GIT_CEILING]: tmpdir() };
  const { status, stderr } = spawnSync(process.execPath, [script], { cwd, env, encoding: TEXT_ENCODING });
  return { status, stderr };
}

test('every command started through a linked directory ends as it does when started directly', () => {
  const commands = listDualCommands();
  assertFloor(commands.length, COMMAND_FLOOR, 'commands that also export');
  withLinkedScripts((directory, link) => {
    const empty = join(directory, EMPTY_NAME);
    mkdirSync(empty);
    for (const command of commands) {
      // In an empty directory every command finds nothing to check and fails, which is what
      // makes a skip visible: a skipped command exits 0.
      const direct = start(resolve(command), empty);
      assert.notEqual(direct.status, SUCCESS, `${command} started directly in an empty directory passed, so a skip would look the same`);
      const linked = start(join(link, command.slice(SCRIPTS_DIRECTORY.length + 1)), empty);
      assert.deepEqual(linked, direct, `${command} through a link ended differently than started directly`);
    }
  });
});

test('a gate started through a linked directory still refuses uncommitted work', () => {
  withLinkedScripts((directory, link) => {
    const repository = join(directory, REPOSITORY_NAME);
    git(directory, [...GIT_INIT, repository]);
    git(repository, [...COMMIT_IDENTITY, ...GIT_FIRST_COMMIT]);
    writeFileSync(join(repository, UNTRACKED), UNTRACKED_TEXT);
    const run = start(join(link, GATE_SCRIPT), repository);
    assert.equal(run.status, REFUSED, `${GATE_SCRIPT} through a link: ${run.stderr}`);
    assert.ok(run.stderr.includes(UNTRACKED), run.stderr);
  });
});

test('no script decides it runs as a command from the start path or past isMain', () => {
  const files = walkFiles(process.cwd(), SCANNED_DIRECTORIES, SCANNED_EXTENSIONS);
  assertFloor(files.length, FILE_FLOOR, 'source files');
  const sources = files.map((file) => ({ file, source: readFileSync(file, TEXT_ENCODING) }));
  assert.deepEqual(sources.filter(({ source }) => checksStartPath(source)).map(({ file }) => file), []);
  const pastHelper = sources.filter(({ file, source }) => file !== ENTRY_HELPER && MAIN_FLAG.test(stripCommentsAndStrings(source)));
  assert.deepEqual(pastHelper.map(({ file }) => file), []);
});

test('the detection sees a start-path check in code and ignores a comment or a string', () => {
  assert.equal(checksStartPath('if (import.meta.url === pathToFileURL(process.argv[1]).href) run();'), true);
  assert.equal(checksStartPath('const IS_MAIN = pathToFileURL(process.argv[1]).href == import.meta.url;'), true);
  assert.equal(checksStartPath('if (import.meta.url === `file://${process.argv[1]}`) run();'), true);
  assert.equal(checksStartPath('if (import.meta.filename === process.argv?.[1]) run();'), true);
  assert.equal(checksStartPath('if (import.meta.filename === resolve(process.argv.at(1))) run();'), true);
  assert.equal(checksStartPath('if (fileURLToPath(import.meta.url) === realpathSync(process.argv.at(1))) run();'), true);
  assert.equal(checksStartPath('const [, entry] = process.argv;\nif (fileURLToPath(import.meta.url) === entry) run();'), true);
  assert.equal(checksStartPath('if (process.argv.includes(fileURLToPath(import.meta.url))) run();'), true);
  assert.equal(checksStartPath('const { argv } = process;\nif (here === argv[1]) run();'), true);
  assert.equal(checksStartPath('if (isMain(import.meta)) run();'), false);
  assert.equal(checksStartPath('const here = dirname(fileURLToPath(import.meta.url));'), false);
  assert.equal(checksStartPath('const port = process.argv.find((argument) => argument.startsWith(PORT));'), false);
  assert.equal(checksStartPath('// if (import.meta.url === pathToFileURL(process.argv[1]).href)'), false);
  assert.equal(checksStartPath("const text = 'process.argv[1]';"), false);
});

test('a Node that cannot tell a command from an import refuses instead of skipping', () => {
  assert.equal(isMain({ main: true }), true);
  assert.equal(isMain({ main: false }), false);
  assert.throws(() => isMain({}), (error) => error.message.includes(process.version));
});
