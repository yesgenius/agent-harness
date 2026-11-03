/**
 * @file The push barrier guards the declared release branch.
 *
 * A barrier that looks active and is not answers "is the release branch protected" with a lie.
 * Two languages hold the same branch name, so reading the hook proves nothing about the
 * behaviour: this guard runs the hooks and watches them refuse. A workflow that spells a branch
 * out checks one branch and pushes another as soon as the declaration changes.
 */
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { test } from 'node:test';
import { loadConfig } from '../../scripts/lib/config.js';
import { assertFloor, walkFiles } from '../../scripts/lib/scan.js';

const PRE_PUSH = resolve('.githooks/pre-push');
const PRE_COMMIT = resolve('.githooks/pre-commit');
const ZERO_OBJECT = '0'.repeat(40);
const INTENT_VALUE = '1';
const OTHER_VALUES = ['0', 'no', 'true'];
const ALLOWED = 0;
const REFUSED = 1;
const WORKFLOW_ROOTS = ['.claude/skills', '.agents/skills'];
const WORKFLOW_FLOOR = 2;

const { releaseBranch, developmentBranch, intentVariable } = loadConfig();

/**
 * Runs the pre-push hook with one pushed ref.
 * @param {string} branch Remote branch being moved.
 * @param {object} [extraEnv] Extra environment.
 * @returns {number} Hook exit code.
 */
function runPrePush(branch, extraEnv = {}) {
  const input = `refs/heads/${branch} ${ZERO_OBJECT} refs/heads/${branch} ${ZERO_OBJECT}\n`;
  return spawnSync('sh', [PRE_PUSH], { input, env: { ...process.env, [intentVariable]: '', ...extraEnv } }).status;
}

/**
 * Runs the pre-commit hook inside a throwaway repository on a branch.
 * @param {string} branch Branch to stand on.
 * @param {object} [extraEnv] Extra environment.
 * @returns {number} Hook exit code.
 */
function runPreCommit(branch, extraEnv = {}) {
  const directory = mkdtempSync(join(tmpdir(), 'harness-barrier-'));
  try {
    spawnSync('git', ['init', '-q', '-b', branch], { cwd: directory });
    return spawnSync('sh', [PRE_COMMIT], { cwd: directory, env: { ...process.env, [intentVariable]: '', ...extraEnv } }).status;
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
}

test('the commit barrier names the declared development branch', () => {
  assert.ok(readFileSync(PRE_COMMIT, 'utf8').includes(`DEVELOPMENT_BRANCH='${developmentBranch}'`));
});

test('no workflow spells a declared branch in a git command', () => {
  const literal = new RegExp(`\\b(?:origin/|origin |\\.\\.)(?:${developmentBranch}|${releaseBranch})\\b`);
  const files = walkFiles(process.cwd(), WORKFLOW_ROOTS, ['.md']);
  assertFloor(files.length, WORKFLOW_FLOOR, 'workflows');
  assert.deepEqual(files.filter((file) => literal.test(readFileSync(file, 'utf8'))), []);
});

test('a push to the release branch is refused without intent', () => {
  assert.equal(runPrePush(releaseBranch), REFUSED);
});

test('a push to the release branch passes with declared intent', () => {
  assert.equal(runPrePush(releaseBranch, { [intentVariable]: INTENT_VALUE }), ALLOWED);
});

test('a push to the release branch is refused with any other intent value', () => {
  for (const value of OTHER_VALUES) {
    assert.equal(runPrePush(releaseBranch, { [intentVariable]: value }), REFUSED, `${intentVariable}=${value}`);
  }
});

test('a push to the development branch passes', () => {
  assert.equal(runPrePush(developmentBranch), ALLOWED);
});

test('a commit on the release branch is refused without intent', () => {
  assert.equal(runPreCommit(releaseBranch), REFUSED);
});

test('a commit on the release branch passes with declared intent', () => {
  assert.equal(runPreCommit(releaseBranch, { [intentVariable]: INTENT_VALUE }), ALLOWED);
});

test('a commit on the release branch is refused with any other intent value', () => {
  for (const value of OTHER_VALUES) {
    assert.equal(runPreCommit(releaseBranch, { [intentVariable]: value }), REFUSED, `${intentVariable}=${value}`);
  }
});

test('a commit on the development branch passes', () => {
  assert.equal(runPreCommit(developmentBranch), ALLOWED);
});
