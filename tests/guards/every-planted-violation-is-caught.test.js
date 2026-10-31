/**
 * @file Every planted violation is caught.
 *
 * A guard that cannot fail is worse than no guard: it reads as protection. Each rule is broken in
 * a throwaway copy, and the guard must pass before the break and fail after it. This is what makes
 * a green suite evidence rather than decoration.
 */
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { plantApplies, runPlant } from '../../scripts/lib/plant-runner.js';
import { PLANTS } from '../../scripts/lib/plants.js';
import { assertFloor } from '../../scripts/lib/scan.js';

const PLANT_FLOOR = 5;
const root = process.cwd();
const plants = PLANTS.filter((plant) => plantApplies(plant, root));

test('enough violations are planted', () => {
  assertFloor(plants.length, PLANT_FLOOR, 'planted violations');
});

for (const plant of plants) {
  test(plant.story, () => {
    const { cleanPassed, caught } = runPlant(plant, root);
    assert.ok(cleanPassed, `${plant.guard} fails on a clean tree.`);
    assert.ok(caught, `${plant.guard} did not catch this.`);
  });
}
