/**
 * @file Arms the git hooks and the declared commit identity on install.
 *
 * Runs from the `prepare` lifecycle, so it must never fail an install: a failure here is
 * reported, and `scripts/check-workstation.js` is the barrier that stops the build.
 */
import { execFileSync } from 'node:child_process';
import { loadConfig } from './lib/config.js';

const HOOKS_PATH = '.githooks';
const SUCCESS_EXIT = 0;

/**
 * Sets one local git configuration value.
 * @param {string} key Git configuration key.
 * @param {string} value Value to set.
 * @returns {void}
 */
function setGitConfig(key, value) {
  execFileSync('git', ['config', '--local', key, value], { stdio: 'pipe' });
}

try {
  setGitConfig('core.hooksPath', HOOKS_PATH);
  const { gitIdentity } = loadConfig();
  if (gitIdentity) {
    setGitConfig('user.name', gitIdentity.name);
    setGitConfig('user.email', gitIdentity.email);
  }
} catch (error) {
  process.stderr.write(`install-hooks: ${error.message}\n`);
}
process.exitCode = SUCCESS_EXIT;
