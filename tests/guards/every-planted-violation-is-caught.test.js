/**
 * @file Every planted violation is caught.
 *
 * A guard that cannot fail is worse than no guard: it reads as protection. Each rule is broken in
 * a throwaway copy, and the guard must pass before the break and fail after it. This is what makes
 * a green suite evidence rather than decoration.
 */
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { GUARD_NOT_RUN, plantApplies, runGuard, runPlant } from '../../scripts/lib/plant-runner.js';
import { PLANTS } from '../../scripts/lib/plants.js';
import { assertFloor } from '../../scripts/lib/scan.js';

const PLANT_FLOOR = 5;
const HANG_PREFIX = 'harness-hang-';
const HANGING_GUARD = 'hangs.test.js';
const HANGING_GUARD_SOURCE = "import { test } from 'node:test';\ntest('never ends', () => new Promise(() => setInterval(() => {}, 1000)));\n";
const SHORT_TIMEOUT_MS = 2000;
const TIMED_OUT = 'ETIMEDOUT';
const root = process.cwd();
const plants = PLANTS.filter((plant) => plantApplies(plant, root));

test('enough violations are planted', () => {
  assertFloor(plants.length, PLANT_FLOOR, 'planted violations');
});

test('a guard that never finishes is reported as not run, not as caught', () => {
  const directory = mkdtempSync(join(tmpdir(), HANG_PREFIX));
  try {
    writeFileSync(join(directory, HANGING_GUARD), HANGING_GUARD_SOURCE);
    assert.throws(
      () => runGuard(directory, HANGING_GUARD, { timeoutMs: SHORT_TIMEOUT_MS }),
      ({ message }) => message.includes(GUARD_NOT_RUN) && message.includes(TIMED_OUT),
    );
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

for (const plant of plants) {
  test(plant.story, () => {
    const { cleanPassed, caught, output } = runPlant(plant, root);
    assert.ok(cleanPassed, `${plant.guard} fails on a clean tree:\n${output}`);
    assert.ok(caught, `${plant.guard} did not catch this:\n${output}`);
  });
}
