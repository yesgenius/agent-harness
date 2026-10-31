/**
 * @file A staged secret is reported without its value.
 *
 * The instruction forbids printing a secret, and a commit workflow reads the staged diff. If the
 * diff comes first, the check for a credential runs after the credential is already on the screen
 * and in the session log. So the scan runs first, and it says where, never what.
 */
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { test } from 'node:test';
import { SCAN_FAILED } from '../../scripts/check-staged-secrets.js';

const SCAN_SCRIPT = resolve('scripts/check-staged-secrets.js');
const SCAN_COMMAND = 'npm run --silent secrets:staged';
const CONTENT_DIFF = /^git diff --staged$/m;
const WORKFLOWS = ['.claude/skills/commit/SKILL.md', '.claude/skills/push/SKILL.md'];
const STAGED_FILE = 'settings.txt';
const PATTERN_LIKE_FILE = ':settings.txt';
const FILE_NAMES_TAKE_A_COLON = process.platform !== 'win32';
const FAKE_VALUE = ['correct', 'horse', 'battery', 'staple'].join('');
const SECRET_LINE = `SERVICE_TOKEN=${FAKE_VALUE}\n`;
const CLEAN_LINE = 'SERVICE_TOKEN=\n';
const TEMP_PREFIX = 'harness-secret-';
const ABSENT_REPOSITORY = 'absent';
const REFUSED = 1;

/**
 * Runs the scan in a throwaway repository after a staged change.
 * @param {(directory: string) => void} stage What the staged change does.
 * @returns {{status: number, stdout: string, stderr: string}} What the scan did.
 */
function scanAfter(stage) {
  const directory = mkdtempSync(join(tmpdir(), TEMP_PREFIX));
  try {
    spawnSync('git', ['init', '-q'], { cwd: directory });
    stage(directory);
    return spawnSync(process.execPath, [SCAN_SCRIPT], { cwd: directory, encoding: 'utf8' });
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
}

/**
 * Asserts the scan refused, named the file and kept the value to itself.
 * @param {{status: number, stdout: string, stderr: string}} result What the scan did.
 * @param {string} file File the scan must name.
 * @returns {void}
 */
function assertRefusedWithoutValue({ status, stdout, stderr }, file = STAGED_FILE) {
  assert.equal(status, REFUSED);
  assert.ok(stderr.includes(file), 'The scan must say where the credential is.');
  assert.ok(!`${stdout}${stderr}`.includes(FAKE_VALUE), 'The scan printed the value.');
}

test('a staged credential is refused, by path only', () => {
  assertRefusedWithoutValue(scanAfter((directory) => {
    writeFileSync(join(directory, STAGED_FILE), SECRET_LINE);
    spawnSync('git', ['add', STAGED_FILE], { cwd: directory });
  }));
});

test('a credential the diff would print as removed is refused too', () => {
  assertRefusedWithoutValue(scanAfter((directory) => {
    writeFileSync(join(directory, STAGED_FILE), SECRET_LINE);
    spawnSync('git', ['add', STAGED_FILE], { cwd: directory });
    spawnSync('git', ['-c', 'user.name=guard', '-c', 'user.email=guard@example.invalid', 'commit', '-qm', 'seed'], { cwd: directory });
    writeFileSync(join(directory, STAGED_FILE), CLEAN_LINE);
    spawnSync('git', ['add', STAGED_FILE], { cwd: directory });
  }));
});

test('a file name that reads as a pattern is scanned under its own name', { skip: !FILE_NAMES_TAKE_A_COLON }, () => {
  assertRefusedWithoutValue(scanAfter((directory) => {
    writeFileSync(join(directory, PATTERN_LIKE_FILE), SECRET_LINE);
    spawnSync('git', ['--literal-pathspecs', 'add', '--', PATTERN_LIKE_FILE], { cwd: directory });
  }), PATTERN_LIKE_FILE);
});

test('an unreadable staged change is refused without output from git', () => {
  const directory = mkdtempSync(join(tmpdir(), TEMP_PREFIX));
  try {
    const env = { ...process.env, GIT_DIR: join(directory, ABSENT_REPOSITORY) };
    const { status, stderr } = spawnSync(process.execPath, [SCAN_SCRIPT], { cwd: directory, encoding: 'utf8', env });
    assert.equal(status, REFUSED);
    assert.equal(stderr, `${SCAN_FAILED}\n`);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

for (const workflow of WORKFLOWS) {
  test(`${workflow} scans before it reads the staged content`, () => {
    const text = readFileSync(workflow, 'utf8');
    const scan = text.indexOf(SCAN_COMMAND);
    assert.ok(scan >= 0, `${SCAN_COMMAND} is gone from ${workflow}.`);
    assert.ok(scan < text.search(CONTENT_DIFF), 'The staged content is read before the scan.');
  });
}
