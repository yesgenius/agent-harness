/**
 * @file Holds the logs and the process model to the same transition names.
 *
 * A log line prefixed with a transition id reads against the model line by line. That only
 * works while the names match, so a renamed id on either side is a failure here.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { assertFloor, walkFiles } from '../lib/scan.js';
import { loadModels } from './model.js';

const SOURCE_EXTENSIONS = ['.js'];
const TRANSITION_ID_TAIL = '[a-z0-9.-]+';
const TRANSITION_FLOOR = 1;
const FAILURE_EXIT = 1;

/**
 * Compares each model's transition ids with the prefixes its sources log.
 * @param {string} root Repository root.
 * @returns {string[]} One line per mismatch.
 */
export function findPrefixProblems(root = process.cwd()) {
  const problems = [];
  for (const { entry, model } of loadModels(root)) {
    assertFloor(model.transitions.length, TRANSITION_FLOOR, 'transitions');
    const files = walkFiles(root, entry.sources, SOURCE_EXTENSIONS);
    assertFloor(files.length, TRANSITION_FLOOR, 'source files');
    const prefix = new RegExp(`\\[(${model.name}\\.${TRANSITION_ID_TAIL})\\]`, 'g');
    const logged = new Set(files.flatMap((file) => [...readFileSync(join(root, file), 'utf8').matchAll(prefix)].map((match) => match[1])));
    const declared = new Set(model.transitions.map((transition) => transition.id));
    for (const id of declared) if (!logged.has(id)) problems.push(`${entry.model}: transition ${id} is never logged.`);
    for (const id of logged) if (!declared.has(id)) problems.push(`${entry.model}: the logged prefix [${id}] is not a transition.`);
  }
  return problems;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const problems = findPrefixProblems();
  for (const problem of problems) process.stderr.write(`fsm:prefixes: ${problem}\n`);
  if (problems.length > 0) process.exitCode = FAILURE_EXIT;
  else process.stdout.write('fsm:prefixes: ok\n');
}
