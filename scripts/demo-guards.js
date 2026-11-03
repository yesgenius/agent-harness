/**
 * @file Shows a person, not a test runner, that the guards can fail: breaks a copy of the
 * repository one rule at a time and prints which guard stopped it. The real tree is not touched.
 */
import { PLANTS } from './lib/plants.js';
import { plantApplies, runPlant } from './lib/plant-runner.js';

const FAILURE_EXIT = 1;
// Only the first outcome is a guard that did its job: a guard that fails on a clean tree, or did
// not run to a result, proves nothing about the violation.
const VERDICT = {
  CAUGHT: 'поймано ',
  MISSED: 'ПРОПУЩЕНО',
  BROKEN: 'ПАДАЕТ И БЕЗ ПОЛОМКИ',
  NOT_RUN: 'НЕ ВЫПОЛНЕНО',
};

const root = process.cwd();
const plants = PLANTS.filter((plant) => plantApplies(plant, root));
let missed = 0;
for (const plant of plants) {
  let verdict;
  let detail = '';
  try {
    const { cleanPassed, caught, output } = runPlant(plant, root);
    verdict = !cleanPassed ? VERDICT.BROKEN : caught ? VERDICT.CAUGHT : VERDICT.MISSED;
    if (verdict !== VERDICT.CAUGHT) detail = output;
  } catch (error) {
    verdict = VERDICT.NOT_RUN;
    detail = String(error?.message ?? error);
  }
  if (verdict !== VERDICT.CAUGHT) missed += 1;
  process.stdout.write(`${verdict}  ${plant.story}\n          ${plant.guard.split('/').at(-1)}\n`);
  if (detail) process.stdout.write(`${detail.trimEnd()}\n\n`);
}
process.stdout.write(`\nНарушений: ${plants.length}, поймано: ${plants.length - missed}\n`);
if (missed > 0) process.exitCode = FAILURE_EXIT;
