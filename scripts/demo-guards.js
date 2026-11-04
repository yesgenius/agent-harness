/**
 * @file Shows a person, not a test runner, that the guards can fail: breaks a copy of the
 * repository one rule at a time and prints which guard stopped it. The real tree is not touched.
 */
import { PLANTS } from './lib/plants.js';
import { plantApplies, runPlant } from './lib/plant-runner.js';

const FAILURE_EXIT = 1;
// Only the first outcome is a guard that did its job: a guard that fails on a clean tree (BROKEN),
// or did not run to a result, proves nothing about the violation.
const VERDICT = {
  CAUGHT: 'caught',
  MISSED: 'MISSED',
  BROKEN: 'BROKEN',
  NOT_RUN: 'NOT RUN',
};
// Every verdict takes one column, so the stories and the guard names under them line up.
const VERDICT_WIDTH = Math.max(...Object.values(VERDICT).map((verdict) => verdict.length)) + 1;
const GAP = '  ';
const GUARD_INDENT = ' '.repeat(VERDICT_WIDTH + GAP.length);
const BROKEN_NOTE = 'The guard fails on the clean copy, before anything was broken:';

const root = process.cwd();
const plants = PLANTS.filter((plant) => plantApplies(plant, root));
let missed = 0;
for (const plant of plants) {
  let verdict;
  let detail = '';
  try {
    const { cleanPassed, caught, output } = runPlant(plant, root);
    verdict = !cleanPassed ? VERDICT.BROKEN : caught ? VERDICT.CAUGHT : VERDICT.MISSED;
    if (verdict === VERDICT.BROKEN) detail = `${BROKEN_NOTE}\n${output}`;
    else if (verdict !== VERDICT.CAUGHT) detail = output;
  } catch (error) {
    verdict = VERDICT.NOT_RUN;
    detail = String(error?.message ?? error);
  }
  if (verdict !== VERDICT.CAUGHT) missed += 1;
  process.stdout.write(`${verdict.padEnd(VERDICT_WIDTH)}${GAP}${plant.story}\n${GUARD_INDENT}${plant.guard.split('/').at(-1)}\n`);
  if (detail) process.stdout.write(`${detail.trimEnd()}\n\n`);
}
process.stdout.write(`\nViolations: ${plants.length}, caught: ${plants.length - missed}\n`);
if (missed > 0) process.exitCode = FAILURE_EXIT;
