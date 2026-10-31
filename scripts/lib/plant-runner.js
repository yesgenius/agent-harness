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

/**
 * Tells whether a plant applies to this repository.
 * @param {object} plant Planted violation.
 * @param {string} root Repository root.
 * @returns {boolean} False when the plant needs a part that was removed on adoption.
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
 * @param {string} [only] Name of the one test to run, for a guard too slow to run whole per plant.
 * @returns {boolean} True when the guard failed, meaning it caught the violation.
 */
function guardFails(directory, guard, only) {
  const env = { ...process.env };
  delete env[TEST_RUNNER_MARKER];
  const filter = only ? [`${TEST_NAME_ARGUMENT}${only}`] : [];
  return spawnSync(process.execPath, ['--test', ...filter, guard], { cwd: directory, stdio: 'pipe', env }).status !== 0;
}

/**
 * Plants one violation and reports what the guard did, before and after.
 * @param {object} plant Planted violation.
 * @param {string} root Repository root.
 * @returns {{cleanPassed: boolean, caught: boolean}} Guard results.
 */
export function runPlant(plant, root) {
  const directory = copyRepository(root);
  try {
    const cleanPassed = !guardFails(directory, plant.guard, plant.only);
    const target = join(directory, plant.path);
    if (plant.create) {
      mkdirSync(dirname(target), { recursive: true });
      writeFileSync(target, plant.create);
    } else {
      const before = readFileSync(target, 'utf8');
      const after = plant.edit(before, directory);
      if (after === before) throw new Error(`Plant changed nothing: ${plant.story}`);
      writeFileSync(target, after);
    }
    return { cleanPassed, caught: guardFails(directory, plant.guard, plant.only) };
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
}
