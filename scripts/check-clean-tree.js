/**
 * @file Proves the working tree holds nothing that is not committed.
 *
 * A release is the commit the release branch points at, so whatever is not in that commit does
 * not ship. A comparison of files against the index misses a file nobody added and a change
 * already staged, and stays green while the release goes out without them. This step asks git
 * for every difference from the last commit, untracked files included, and names each path.
 */
import { execFileSync } from 'node:child_process';
import { realpathSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

const FAILURE_EXIT = 1;
const NUL = '\0';
const STATUS_CODE_WIDTH = 2;
const RENAME_CODES = /[RC]/;
const MAX_STATUS_BYTES = 64 * 1024 * 1024;
const STATUS_COMMAND = ['status', '--porcelain=v1', '-z', '--untracked-files=all'];
export const READ_FAILED = 'tree: git status could not be read, so the tree is not checked.';
// Node runs the main module from its real path, so a symlinked invocation must be resolved too,
// or this check is skipped and passes.
const IS_MAIN = Boolean(process.argv[1]) && import.meta.url === pathToFileURL(realpathSync(process.argv[1])).href;

/**
 * Lists every path that differs from the last commit: modified, staged, deleted or untracked.
 * @param {string} root Repository root.
 * @returns {string[]} One entry per path, as git prints it with its two-letter status.
 */
export function findUncommitted(root = process.cwd()) {
  const fields = execFileSync('git', STATUS_COMMAND, { cwd: root, encoding: 'utf8', stdio: 'pipe', maxBuffer: MAX_STATUS_BYTES }).split(NUL);
  const entries = [];
  for (let index = 0; index < fields.length; index += 1) {
    const field = fields[index];
    if (!field) continue;
    entries.push(field);
    // A rename or copy, staged or in the work tree, is followed by its source path in the next field.
    if (RENAME_CODES.test(field.slice(0, STATUS_CODE_WIDTH))) index += 1;
  }
  return entries;
}

if (IS_MAIN) {
  try {
    const entries = findUncommitted();
    for (const entry of entries) process.stderr.write(`tree: not committed: ${entry}\n`);
    if (entries.length > 0) process.exitCode = FAILURE_EXIT;
    else process.stdout.write('tree: clean\n');
  } catch (error) {
    process.stderr.write(`${READ_FAILED}\n${String(error.stderr || error.message).trim()}\n`);
    process.exitCode = FAILURE_EXIT;
  }
}
