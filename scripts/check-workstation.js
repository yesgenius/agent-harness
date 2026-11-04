/**
 * @file Proves this machine can build the project the way every other machine does.
 *
 * What version control cannot carry — the runtime version, the armed hooks, the commit
 * identity — differs between machines without any error of its own.
 */
import { execFileSync } from 'node:child_process';
import { accessSync, constants, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { loadConfig } from './lib/config.js';
import { isMain, NODE_VERSION_FILE } from './lib/entry.js';

const HOOKS_PATH = '.githooks';
const HOOK_FILES = ['pre-commit', 'pre-push'];
const FAILURE_EXIT = 1;

/**
 * Reads one local git configuration value.
 * @param {string} key Git configuration key.
 * @returns {string} The value, or an empty string when unset.
 */
function readGitConfig(key) {
  try {
    return execFileSync('git', ['config', '--get', key], { encoding: 'utf8', stdio: 'pipe' }).trim();
  } catch {
    return '';
  }
}

/**
 * Collects every property this machine fails.
 * @param {string} root Repository root.
 * @returns {string[]} One line per failure, each naming its remedy.
 */
export function findWorkstationProblems(root = process.cwd()) {
  const problems = [];
  const expectedNode = readFileSync(join(root, NODE_VERSION_FILE), 'utf8').trim();
  const actualNode = process.versions.node.split('.')[0];
  if (actualNode !== expectedNode) {
    problems.push(`Node ${actualNode} is running, ${NODE_VERSION_FILE} declares ${expectedNode}. Remedy: install and select Node ${expectedNode}.`);
  }
  if (readGitConfig('core.hooksPath') !== HOOKS_PATH) {
    problems.push(`git hooks are not armed. Remedy: npm install.`);
  }
  for (const hook of HOOK_FILES) {
    try {
      accessSync(join(root, HOOKS_PATH, hook), constants.X_OK);
    } catch {
      problems.push(`${HOOKS_PATH}/${hook} is not executable. Remedy: chmod +x ${HOOKS_PATH}/${hook}.`);
    }
  }
  const { gitIdentity } = loadConfig(root);
  if (gitIdentity && readGitConfig('user.email') !== gitIdentity.email) {
    problems.push(`The commit identity differs from harness.config.json. Remedy: npm install.`);
  }
  return problems;
}

if (isMain(import.meta)) {
  const problems = findWorkstationProblems();
  for (const problem of problems) process.stderr.write(`workstation: ${problem}\n`);
  if (problems.length > 0) process.exitCode = FAILURE_EXIT;
  else process.stdout.write('workstation: ok\n');
}
