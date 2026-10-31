/**
 * @file Shows a person, not a test runner, that the guards can fail: breaks a copy of the
 * repository one rule at a time and prints which guard stopped it. The real tree is not touched.
 */
import { PLANTS } from './lib/plants.js';
import { plantApplies, runPlant } from './lib/plant-runner.js';

const FAILURE_EXIT = 1;

const root = process.cwd();
const plants = PLANTS.filter((plant) => plantApplies(plant, root));
let missed = 0;
for (const plant of plants) {
  const { cleanPassed, caught } = runPlant(plant, root);
  const stopped = cleanPassed && caught;
  if (!stopped) missed += 1;
  process.stdout.write(`${stopped ? 'поймано ' : 'ПРОПУЩЕНО'}  ${plant.story}\n          ${plant.guard.split('/').at(-1)}\n`);
}
process.stdout.write(`\nНарушений: ${plants.length}, поймано: ${plants.length - missed}\n`);
if (missed > 0) process.exitCode = FAILURE_EXIT;
