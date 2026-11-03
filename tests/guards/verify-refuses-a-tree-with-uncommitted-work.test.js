/**
 * @file Verify refuses a tree with uncommitted work.
 *
 * The release contract trusts a green verify to mean the commit holds everything that was
 * checked. A check that sees only unstaged edits to tracked files passes a forgotten new file and
 * a staged change, and the release ships without them. So each kind of uncommitted work is made
 * in a throwaway repository, and the check must name it.
 */
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, unlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { test } from 'node:test';
import { findUncommitted } from '../../scripts/check-clean-tree.js';

const CHECK_SCRIPT = resolve('scripts/check-clean-tree.js');
const CHECK_NAME = 'tree:clean';
const CHECK_RUN = 'node scripts/check-clean-tree.js';
const VERIFY_CHAIN = `npm run build && npm test && npm run ${CHECK_NAME}`;
const TRACKED = 'tracked.txt';
const OTHER = 'other.txt';
const NEW_FILE = 'forgotten.txt';
const ORIGINAL_TEXT = 'committed\n';
const OTHER_TEXT = 'another committed file\n';
const CHANGED_TEXT = 'changed\n';
const REFUSED = 1;
const ALLOWED = 0;
const COMMIT_IDENTITY = ['-c', 'user.name=guard', '-c', 'user.email=guard@example.invalid', '-c', 'commit.gpgsign=false'];
const GIT_ENVIRONMENT = /^GIT_/;

// A hook or shell that exports GIT_DIR would point every command below at the real repository.
for (const name of Object.keys(process.env)) if (GIT_ENVIRONMENT.test(name)) delete process.env[name];

/**
 * Runs git in a directory and fails the test when git fails.
 * @param {string} directory Working directory.
 * @param {string[]} args Git arguments.
 * @returns {void}
 */
function git(directory, args) {
  const { status, stderr } = spawnSync('git', args, { cwd: directory, encoding: 'utf8' });
  assert.equal(status, 0, `git ${args.join(' ')}: ${stderr}`);
}

/**
 * Runs a step in a throwaway repository with two committed files.
 * @param {(directory: string) => void} step What to do in the repository.
 * @returns {void}
 */
function inRepository(step) {
  const directory = mkdtempSync(join(tmpdir(), 'harness-tree-'));
  try {
    git(directory, ['init', '-q']);
    writeFileSync(join(directory, TRACKED), ORIGINAL_TEXT);
    writeFileSync(join(directory, OTHER), OTHER_TEXT);
    git(directory, ['add', '.']);
    git(directory, [...COMMIT_IDENTITY, 'commit', '-q', '--no-verify', '-m', 'start']);
    step(directory);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
}

/**
 * Runs the check as verify runs it.
 * @param {string} directory Repository to check.
 * @returns {number} Exit code.
 */
const runCheck = (directory) => spawnSync(process.execPath, [CHECK_SCRIPT], { cwd: directory, stdio: 'pipe' }).status;

test('verify ends with the clean-tree check, and every step must pass', () => {
  const { scripts } = JSON.parse(readFileSync('package.json', 'utf8'));
  assert.equal(scripts.verify, VERIFY_CHAIN);
  assert.equal(scripts[CHECK_NAME], CHECK_RUN);
});

test('a committed tree passes', () => {
  inRepository((directory) => {
    assert.deepEqual(findUncommitted(directory), []);
    assert.equal(runCheck(directory), ALLOWED);
  });
});

test('an unstaged edit is refused and named', () => {
  inRepository((directory) => {
    writeFileSync(join(directory, TRACKED), CHANGED_TEXT);
    assert.deepEqual(findUncommitted(directory), [` M ${TRACKED}`]);
    assert.equal(runCheck(directory), REFUSED);
  });
});

test('a staged edit is refused and named', () => {
  inRepository((directory) => {
    writeFileSync(join(directory, TRACKED), CHANGED_TEXT);
    git(directory, ['add', TRACKED]);
    assert.deepEqual(findUncommitted(directory), [`M  ${TRACKED}`]);
    assert.equal(runCheck(directory), REFUSED);
  });
});

test('a file nobody added is refused and named', () => {
  inRepository((directory) => {
    writeFileSync(join(directory, NEW_FILE), CHANGED_TEXT);
    assert.deepEqual(findUncommitted(directory), [`?? ${NEW_FILE}`]);
    assert.equal(runCheck(directory), REFUSED);
  });
});

test('a staged rename is one entry, so its source is not read as a status', () => {
  inRepository((directory) => {
    git(directory, ['mv', TRACKED, NEW_FILE]);
    writeFileSync(join(directory, OTHER), CHANGED_TEXT);
    assert.deepEqual(findUncommitted(directory), [`R  ${NEW_FILE}`, ` M ${OTHER}`]);
  });
});

test('a work-tree rename is one entry, so the next path is still named', () => {
  inRepository((directory) => {
    writeFileSync(join(directory, NEW_FILE), ORIGINAL_TEXT);
    git(directory, ['add', '-N', NEW_FILE]);
    unlinkSync(join(directory, TRACKED));
    writeFileSync(join(directory, OTHER), CHANGED_TEXT);
    const entries = findUncommitted(directory);
    assert.ok(entries.includes(` M ${OTHER}`), entries.join(' | '));
    assert.ok(!entries.includes(TRACKED), entries.join(' | '));
  });
});
