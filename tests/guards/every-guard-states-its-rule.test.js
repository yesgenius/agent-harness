/**
 * @file Every guard states its rule.
 *
 * Added for this template. An agent that meets a failing test with no explanation tends to fix
 * the test. A guard named as a sentence, with a header saying what breaks without it, tells the
 * agent to fix the change instead. The register in docs/specs/GUARDS.md is how a person finds the
 * rule without opening the test: a guard missing from it is a rule nobody can look up, a row left
 * after its guard is gone is protection that is not there, and a wrong count of planted violations
 * tells a person a guard was proven to fail more often than it was.
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { PLANTS } from '../../scripts/lib/plants.js';
import { assertFloor, walkFiles } from '../../scripts/lib/scan.js';

const GUARD_DIRECTORIES = ['tests/guards', 'example/tests/guards'];
const GUARD_SUFFIX = '.test.js';
const HEADER = /^\/\*\*\n \* @file [^\n]+\n \*\n( \* [^\n]+\n){2,}/;
const SENTENCE_WORDS = 4;
const GUARD_FLOOR = 5;
const REGISTER = 'docs/specs/GUARDS.md';
const REGISTER_HEADING = '## Сторожа этого репозитория';
const NEXT_HEADING = '\n## ';
const REGISTER_ROW = /^\| `([a-z0-9-]+)` \|.*\| (\d+|—) \|$/gm;
const NO_PLANTS = '—';

/**
 * Names a guard the way the register does: the file name without its suffix.
 * @param {string} file Guard path.
 * @returns {string} Guard name.
 */
const guardName = (file) => file.split('/').at(-1).slice(0, -GUARD_SUFFIX.length);

/**
 * Reads the register table: each row's guard name and its count of planted violations.
 * @returns {Map<string, number>} Planted violations per listed guard.
 */
function readRegister() {
  const text = readFileSync(REGISTER, 'utf8');
  const start = text.indexOf(REGISTER_HEADING);
  assert.ok(start >= 0, `${REGISTER} has no section ${REGISTER_HEADING}`);
  const end = text.indexOf(NEXT_HEADING, start);
  const rows = [...text.slice(start, end < 0 ? undefined : end).matchAll(REGISTER_ROW)];
  return new Map(rows.map(([, name, count]) => [name, count === NO_PLANTS ? 0 : Number(count)]));
}

const guards = walkFiles(process.cwd(), GUARD_DIRECTORIES, ['.js']).filter((file) => file.endsWith(GUARD_SUFFIX));

test('a guard is named as a sentence', () => {
  assertFloor(guards.length, GUARD_FLOOR, 'guards');
  const short = guards.filter((file) => guardName(file).split('-').length < SENTENCE_WORDS);
  assert.deepEqual(short, []);
});

test('a guard says what breaks without it', () => {
  assert.deepEqual(guards.filter((file) => !HEADER.test(readFileSync(file, 'utf8'))), []);
});

test('a guard is listed in the register', () => {
  const register = readRegister();
  assertFloor(register.size, GUARD_FLOOR, 'register rows');
  assert.deepEqual(guards.map(guardName).filter((name) => !register.has(name)), []);
});

test('the register lists only guards that exist', () => {
  const names = new Set(guards.map(guardName));
  assert.deepEqual([...readRegister().keys()].filter((name) => !names.has(name)), []);
});

test('the register counts the planted violations of each guard', () => {
  const wrong = [...readRegister()]
    .map(([name, count]) => ({ name, count, planted: PLANTS.filter((plant) => guardName(plant.guard) === name).length }))
    .filter(({ count, planted }) => count !== planted);
  assert.deepEqual(wrong, []);
});
