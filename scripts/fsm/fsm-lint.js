/**
 * @file Build step: every declared process model is well formed.
 */
import { lintModel, loadModels } from './model.js';

const FAILURE_EXIT = 1;

const problems = loadModels().flatMap(({ entry, model }) => lintModel(model).map((problem) => `${entry.model}: ${problem}`));
for (const problem of problems) process.stderr.write(`fsm:lint: ${problem}\n`);
if (problems.length > 0) process.exitCode = FAILURE_EXIT;
else process.stdout.write('fsm:lint: ok\n');
