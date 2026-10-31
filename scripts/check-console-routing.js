/**
 * @file Refuses a direct console call outside the one logging sink.
 *
 * The build step and the guard both call `findConsoleProblems`: a private copy of the walk
 * in the guard would let the two enforce different rules while both stayed green.
 * The detection is token-level: it strips comments and strings and looks for the word.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { loadConfig } from './lib/config.js';
import { assertFloor, walkFiles } from './lib/scan.js';

const SOURCE_EXTENSIONS = ['.js'];
const CONSOLE_TOKEN = /\bconsole\b/;
const FILE_FLOOR = 1;
const FAILURE_EXIT = 1;
const COMMENT_OR_STRING = /\/\*[\s\S]*?\*\/|\/\/[^\n]*|'(?:\\.|[^'\\\n])*'|"(?:\\.|[^"\\\n])*"|`(?:\\.|[^`\\])*`/g;

/**
 * Removes comments and string contents, keeping code tokens.
 * @param {string} source JavaScript source.
 * @returns {string} Source with comments and strings blanked.
 */
export function stripCommentsAndStrings(source) {
  return source.replace(COMMENT_OR_STRING, ' ');
}

/**
 * Tells whether a source touches the console.
 * @param {string} source JavaScript source.
 * @returns {boolean} True when the console is reached from code.
 */
export function touchesConsole(source) {
  return CONSOLE_TOKEN.test(stripCommentsAndStrings(source));
}

/**
 * Finds every violation of the single-sink rule.
 * @param {string} root Repository root.
 * @returns {string[]} One line per violation.
 */
export function findConsoleProblems(root = process.cwd()) {
  const { logging } = loadConfig(root);
  const files = walkFiles(root, logging.sourceRoots, SOURCE_EXTENSIONS);
  assertFloor(files.length, FILE_FLOOR, 'source files');
  const problems = [];
  if (!files.includes(logging.sink)) problems.push(`The declared sink ${logging.sink} is not under the scanned roots.`);
  for (const file of files) {
    const touches = touchesConsole(readFileSync(join(root, file), 'utf8'));
    if (file === logging.sink && !touches) problems.push(`The declared sink ${file} never calls the console: the exemption is dead.`);
    if (file !== logging.sink && touches) problems.push(`${file} calls the console directly; use ${logging.sink}.`);
  }
  return problems;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const problems = findConsoleProblems();
  for (const problem of problems) process.stderr.write(`console-routing: ${problem}\n`);
  if (problems.length > 0) process.exitCode = FAILURE_EXIT;
  else process.stdout.write('console-routing: ok\n');
}
