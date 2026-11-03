/**
 * @file Applies one planted violation to a throwaway copy of the repository and runs its guard.
 */
import { spawnSync } from 'node:child_process';
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, dirname, join, resolve } from 'node:path';

const TEMP_PREFIX = 'harness-plant-';
const PACKAGES_DIRECTORY = 'node_modules';
const TEST_NAME_ARGUMENT = '--test-name-pattern=';
const LINK_TYPE = 'junction';
const SKIPPED_ENTRIES = new Set(['.git', PACKAGES_DIRECTORY]);
// Set by a running test runner. A nested `node --test` that inherits it runs nothing and exits
// clean, which would make every plant look uncaught, or every guard look alive.
const TEST_RUNNER_MARKER = 'NODE_TEST_CONTEXT';
// The test runner exits 0 when every test passed and 1 when one failed. Anything else, a kill or
// no exit at all, says the guard did not run to a result, and that is not a caught violation.
const GUARD_PASSED = 0;
const GUARD_FAILED = 1;
const GUARD_TIMEOUT_MS = 300_000;
export const GUARD_NOT_RUN = 'did not run to a result';
const KILLED_BY = 'killed by';
const EXIT_CODE = 'exit code';
const OUTPUT_TAIL_CHARS = 4000;
const TEXT_ENCODING = 'utf8';

/**
 * Tells whether a plant applies to this repository.
 * @param {object} plant Planted violation.
 * @param {string} root Repository root.
 * @returns {boolean} False when the plant declares in `needs` a path this repository does not have.
 */
export function plantApplies(plant, root) {
  return !plant.needs || existsSync(join(root, plant.needs));
}

/**
 * Makes a throwaway copy of the repository in the system temp directory. Installed packages are
 * linked, not copied, so a build that needs them runs in the copy as it runs here.
 * @param {string} root Repository root.
 * @returns {string} Path of the copy; the caller removes it.
 */
export function copyRepository(root) {
  const directory = mkdtempSync(join(tmpdir(), TEMP_PREFIX));
  try {
    cpSync(root, directory, { recursive: true, filter: (source) => !SKIPPED_ENTRIES.has(basename(source)) });
    const packages = resolve(root, PACKAGES_DIRECTORY);
    if (existsSync(packages)) symlinkSync(packages, join(directory, PACKAGES_DIRECTORY), LINK_TYPE);
    return directory;
  } catch (error) {
    rmSync(directory, { recursive: true, force: true });
    throw error;
  }
}

/**
 * Runs a guard against a copy of the repository.
 * @param {string} directory Copy to run in.
 * @param {string} guard Guard path.
 * @param {{only?: string, timeoutMs?: number}} [options] `only` names the one test to run, for a
 *   guard too slow to run whole per plant; `timeoutMs` is how long the guard may run.
 * @returns {{failed: boolean, output: string}} `failed` is true when the test runner reported a
 *   failure; `output` is the end of what the guard printed. The runner reports a guard file that
 *   cannot load the same way as a failed assertion, so `failed` alone does not tell them apart:
 *   the output does.
 * @throws {Error} When the guard could not start, was killed, ran out of time or exited with a code
 *   the test runner does not use for a result. A timeout stops the runner, not processes the guard
 *   started itself.
 */
export function runGuard(directory, guard, { only, timeoutMs = GUARD_TIMEOUT_MS } = {}) {
  const env = { ...process.env };
  delete env[TEST_RUNNER_MARKER];
  const filter = only ? [`${TEST_NAME_ARGUMENT}${only}`] : [];
  const run = spawnSync(process.execPath, ['--test', ...filter, guard], { cwd: directory, encoding: TEXT_ENCODING, env, timeout: timeoutMs });
  const output = `${run.stdout ?? ''}${run.stderr ?? ''}`.slice(-OUTPUT_TAIL_CHARS);
  if (run.error || run.signal || (run.status !== GUARD_PASSED && run.status !== GUARD_FAILED)) {
    const reason = run.error?.message ?? (run.signal ? `${KILLED_BY} ${run.signal}` : `${EXIT_CODE} ${run.status}`);
    throw new Error(`${guard} ${GUARD_NOT_RUN}: ${reason}\n${output}`);
  }
  return { failed: run.status === GUARD_FAILED, output };
}

/**
 * Plants one violation and reports what the guard did, before and after.
 * @param {object} plant Planted violation.
 * @param {string} root Repository root.
 * @returns {{cleanPassed: boolean, caught: boolean, output: string}} Guard results, and what the
 *   guard printed: on the clean run when it failed there, which ends the check, else on the
 *   planted run.
 * @throws {Error} When the guard did not run to a result on either tree (see `runGuard`).
 */
export function runPlant(plant, root) {
  const directory = copyRepository(root);
  try {
    const clean = runGuard(directory, plant.guard, { only: plant.only });
    if (clean.failed) return { cleanPassed: false, caught: false, output: clean.output };
    const target = join(directory, plant.path);
    if (plant.create) {
      mkdirSync(dirname(target), { recursive: true });
      writeFileSync(target, plant.create);
    } else {
      const before = readFileSync(target, TEXT_ENCODING);
      const after = plant.edit(before, directory);
      if (after === before) throw new Error(`Plant changed nothing: ${plant.story}`);
      writeFileSync(target, after);
    }
    const planted = runGuard(directory, plant.guard, { only: plant.only });
    return { cleanPassed: true, caught: planted.failed, output: planted.output };
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
}
