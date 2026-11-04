/**
 * @file The repository text stays in English.
 *
 * Agents and people read the same rules, specifications and messages. A paragraph an agent wrote
 * in the language of the conversation reads fine to the owner who asked in that language and is
 * noise to everyone else, and nobody notices which half of a document went that way. So no
 * authored text file holds a letter of a script other than Latin. Signs shared by every script —
 * punctuation, arrows, units such as the micro sign, emoji — and accents stay allowed.
 *
 * What the machine sees is the script, not the language: a sentence in another language written
 * in Latin letters passes here, and review catches it.
 *
 * Every file of the tree is read except binary files, credential files (never opened — the same
 * rule the staged-secrets scan uses), files git ignores (read from `.gitignore`, so the temp
 * folder's drafts and reports are out) and the owner's work orders, which are the owner's own
 * words. The rules of the work-order folder are not a work order and are held to the rule.
 */
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { test } from 'node:test';
import { SECRET_PATH } from '../../scripts/check-staged-secrets.js';
import { assertFloor, walkFiles } from '../../scripts/lib/scan.js';

const WHOLE_TREE = ['.'];
const FILE_FLOOR = 50;
const GITIGNORE = '.gitignore';
const WORK_ORDERS_DIRECTORY = 'docs/work-orders/';
const WORK_ORDERS_RULES = `${WORK_ORDERS_DIRECTORY}README.md`;
// A letter of a script other than Latin. Common and Inherited hold the signs every script shares.
const FOREIGN_LETTER = /(?![\p{Script=Latin}\p{Script=Common}\p{Script=Inherited}])\p{L}/u;
const BINARY_MARK = 0;
const LINE_BREAK = '\n';
const TEXT_ENCODING = 'utf8';
const COMMENT = '#';
const NEGATION = '!';
const PATH_SEPARATOR = '/';
const ANY_NAME_PART = '*';
const REGEX_SPECIAL = /[.+?^${}()|[\]\\]/g;

/**
 * Turns one `.gitignore` pattern into a test on a path. Covers the forms a `.gitignore` of this
 * template uses: a folder (`dir/`), a name (`file`, `name.*`, `*.log`) anywhere in the tree, and
 * a path anchored at the root (`docs/temp/`).
 * @param {string} pattern Pattern without the negation mark.
 * @returns {(path: string) => boolean} True when the pattern covers the path.
 */
function patternTest(pattern) {
  const folder = pattern.endsWith(PATH_SEPARATOR);
  const body = folder ? pattern.slice(0, -1) : pattern;
  const anchored = body.includes(PATH_SEPARATOR);
  const source = body.replace(REGEX_SPECIAL, '\\$&').split(ANY_NAME_PART).join('[^/]*');
  const head = anchored ? '^' : '(?:^|/)';
  const tail = folder ? '/' : '(?:$|/)';
  const matcher = new RegExp(`${head}${source}${tail}`);
  return (path) => matcher.test(path);
}

/**
 * Reads the ignore rules of a `.gitignore` text; the last rule that covers a path decides.
 * @param {string} text `.gitignore` text.
 * @returns {(path: string) => boolean} True when git ignores the path.
 */
function ignoreRules(text) {
  const rules = text.split(LINE_BREAK).map((line) => line.trim())
    .filter((line) => line && !line.startsWith(COMMENT))
    .map((line) => {
      const negated = line.startsWith(NEGATION);
      return { negated, covers: patternTest(negated ? line.slice(1) : line) };
    });
  return (path) => rules.reduce((ignored, rule) => (rule.covers(path) ? !rule.negated : ignored), false);
}

/**
 * Tells whether a path is held to the rule.
 * @param {string} path Path relative to the repository root.
 * @param {(path: string) => boolean} ignored The ignore rules of the tree.
 * @returns {boolean} False for credential files, ignored files and the owner's work orders.
 */
function isHeld(path, ignored) {
  if (SECRET_PATH.test(path) || ignored(path)) return false;
  return !path.startsWith(WORK_ORDERS_DIRECTORY) || path === WORK_ORDERS_RULES;
}

/**
 * Lists the lines of a text that hold a letter of a script other than Latin.
 * @param {string} text File text.
 * @returns {number[]} One-based line numbers.
 */
function foreignLines(text) {
  return text.split(LINE_BREAK).flatMap((line, index) => (FOREIGN_LETTER.test(line) ? [index + 1] : []));
}

test('every authored text file is written in Latin letters', () => {
  const ignored = ignoreRules(readFileSync(GITIGNORE, TEXT_ENCODING));
  const found = [];
  let read = 0;
  for (const file of walkFiles(process.cwd(), WHOLE_TREE).filter((path) => isHeld(path, ignored))) {
    const bytes = readFileSync(file);
    if (bytes.includes(BINARY_MARK)) continue;
    read += 1;
    found.push(...foreignLines(bytes.toString(TEXT_ENCODING)).map((line) => `${file}:${line}`));
  }
  assertFloor(read, FILE_FLOOR, 'text files');
  assert.deepEqual(found, [], 'These lines hold letters of a script other than Latin. Write them in English; talk to the owner in the owner\'s language.');
});

test('the detection sees letters of other scripts and ignores shared signs and accented Latin', () => {
  assert.deepEqual(foreignLines('plain text\n\u0442\u0435\u043a\u0441\u0442'), [2]);
  assert.deepEqual(foreignLines('\u03b1\u03b2\u03b3'), [1]);
  assert.deepEqual(foreignLines('\u6587\u5b57'), [1]);
  assert.deepEqual(foreignLines('caf\u00e9 \u00ab quoted \u00bb \u2014 a \u2192 b \u2713 \u{1F600} 1\u20132'), []);
  assert.deepEqual(foreignLines('250 \u00b5s \u2139 pass 12 \u2113 don\u02bct'), []);
});

test('credential files, ignored files and the owner\'s work orders are left out', () => {
  const ignored = ignoreRules(readFileSync(GITIGNORE, TEXT_ENCODING));
  assert.equal(existsSync(WORK_ORDERS_RULES), true, `${WORK_ORDERS_RULES} is gone: the work-order folder moved, move ${WORK_ORDERS_DIRECTORY} here too.`);
  assert.equal(isHeld('docs/specs/RELEASE.md', ignored), true);
  assert.equal(isHeld(WORK_ORDERS_RULES, ignored), true);
  assert.equal(isHeld('.env.example', ignored), true);
  assert.equal(isHeld('docs/work-orders/add-a-button.md', ignored), false);
  assert.equal(isHeld('docs/temp/add-a-button.md', ignored), false);
  assert.equal(isHeld('debug.log', ignored), false);
  assert.equal(isHeld('.env.json', ignored), false);
  assert.equal(isHeld('config/credentials.json', ignored), false);
});

test('the ignore rules read folders, names, wildcards and negations', () => {
  const ignored = ignoreRules('# comment\nnode_modules/\n.env\n.env.*\n!.env.example\n*.log\ndocs/temp/\n');
  assert.equal(ignored('a/node_modules/x.js'), true);
  assert.equal(ignored('.env'), true);
  assert.equal(ignored('sub/.env.local'), true);
  assert.equal(ignored('.env.example'), false);
  assert.equal(ignored('scripts/run.log'), true);
  assert.equal(ignored('docs/temp/report.md'), true);
  assert.equal(ignored('other/docs/temp/report.md'), false);
  assert.equal(ignored('docs/template.md'), false);
});
