/**
 * @file Holds the logs and the process model to the same transition names.
 *
 * A log line prefixed with a transition id reads against the model line by line. That only
 * works while the names match, so a renamed id on either side is a failure here. Only a real
 * logging call counts: a prefix left in a comment or in a plain string logs nothing. The names
 * are compared as sets: the order the code logs them in is not checked here, and an order that
 * matters needs a guard of its own.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { isMain } from '../lib/entry.js';
import { assertFloor, walkFiles } from '../lib/scan.js';
import { tokenize } from '../lib/source-text.js';
import { loadModels } from './model.js';

const SOURCE_EXTENSIONS = ['.js'];
const TRANSITION_ID_TAIL = '[a-z0-9.-]+';
const LOG_CALL_END = /\.(?:debug|info|warn|error)\s*\(\s*$/;
const OPENING_QUOTE = '[`\'"]';
const TRANSITION_FLOOR = 1;
const FAILURE_EXIT = 1;

/**
 * Reads the prefixes a source file really logs: a string that is the first argument of a log call.
 * @param {string} source JavaScript source.
 * @param {RegExp} prefix Pattern of a prefixed string, capturing the id.
 * @returns {string[]} Logged transition ids.
 */
export function findLoggedIds(source, prefix) {
  const tokens = tokenize(source);
  return tokens.flatMap(({ isText, value }, index) => {
    const match = isText && LOG_CALL_END.test(tokens[index - 1]?.value ?? '') ? prefix.exec(value) : null;
    return match ? [match[1]] : [];
  });
}

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
    const prefix = new RegExp(`^${OPENING_QUOTE}\\[(${model.name}\\.${TRANSITION_ID_TAIL})\\]`);
    const logged = new Set(files.flatMap((file) => findLoggedIds(readFileSync(join(root, file), 'utf8'), prefix)));
    const declared = new Set(model.transitions.map((transition) => transition.id));
    for (const id of declared) if (!logged.has(id)) problems.push(`${entry.model}: transition ${id} is never logged.`);
    for (const id of logged) if (!declared.has(id)) problems.push(`${entry.model}: the logged prefix [${id}] is not a transition.`);
  }
  return problems;
}

if (isMain(import.meta)) {
  const problems = findPrefixProblems();
  for (const problem of problems) process.stderr.write(`fsm:prefixes: ${problem}\n`);
  if (problems.length > 0) process.exitCode = FAILURE_EXIT;
  else process.stdout.write('fsm:prefixes: ok\n');
}
