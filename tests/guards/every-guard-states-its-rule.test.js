/**
 * @file Every guard states its rule.
 *
 * Added for this template. An agent that meets a failing test with no explanation tends to fix
 * the test. A guard named as a sentence, with a header saying what breaks without it, tells the
 * agent to fix the change instead.
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { assertFloor, walkFiles } from '../../scripts/lib/scan.js';

const GUARD_DIRECTORIES = ['tests/guards', 'example/tests/guards'];
const GUARD_SUFFIX = '.test.js';
const HEADER = /^\/\*\*\n \* @file [^\n]+\n \*\n( \* [^\n]+\n){2,}/;
const SENTENCE_WORDS = 4;
const GUARD_FLOOR = 5;

const guards = walkFiles(process.cwd(), GUARD_DIRECTORIES, ['.js']).filter((file) => file.endsWith(GUARD_SUFFIX));

test('a guard is named as a sentence', () => {
  assertFloor(guards.length, GUARD_FLOOR, 'guards');
  const short = guards.filter((file) => file.split('/').at(-1).split('-').length < SENTENCE_WORDS);
  assert.deepEqual(short, []);
});

test('a guard says what breaks without it', () => {
  assert.deepEqual(guards.filter((file) => !HEADER.test(readFileSync(file, 'utf8'))), []);
});
