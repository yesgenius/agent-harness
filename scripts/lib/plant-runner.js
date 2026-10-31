/**
 * @file Applies one planted violation to a throwaway copy of the repository and runs its guard.
 */
import { spawnSync } from 'node:child_process';
import { cpSync, existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, join } from 'node:path';

const TEMP_PREFIX = 'harness-plant-';
const SKIPPED_ENTRIES = new Set(['.git', 'node_modules']);
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
 * Runs a guard against a copy of the repository.
 * @param {string} directory Copy to run in.
 * @param {string} guard Guard path.
 * @returns {boolean} True when the guard failed, meaning it caught the violation.
 */
function guardFails(directory, guard) {
  const env = { ...process.env };
  delete env[TEST_RUNNER_MARKER];
  return spawnSync(process.execPath, ['--test', guard], { cwd: directory, stdio: 'pipe', env }).status !== 0;
}

/**
 * Plants one violation and reports what the guard did, before and after.
 * @param {object} plant Planted violation.
 * @param {string} root Repository root.
 * @returns {{cleanPassed: boolean, caught: boolean}} Guard results.
 */
export function runPlant(plant, root) {
  const directory = mkdtempSync(join(tmpdir(), TEMP_PREFIX));
  try {
    cpSync(root, directory, { recursive: true, filter: (source) => !SKIPPED_ENTRIES.has(basename(source)) });
    const cleanPassed = !guardFails(directory, plant.guard);
    const target = join(directory, plant.path);
    if (plant.create) {
      writeFileSync(target, plant.create);
    } else {
      const before = readFileSync(target, 'utf8');
      const after = plant.edit(before, directory);
      if (after === before) throw new Error(`Plant changed nothing: ${plant.story}`);
      writeFileSync(target, after);
    }
    return { cleanPassed, caught: guardFails(directory, plant.guard) };
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
}
