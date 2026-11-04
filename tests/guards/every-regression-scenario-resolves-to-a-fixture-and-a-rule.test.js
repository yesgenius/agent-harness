/**
 * @file Every regression scenario resolves to a fixture and a rule.
 *
 * A protocol is read by an agent that takes it literally. A row naming a page that no longer
 * exists, or a norm that no transition owns, turns a mandatory scenario into something the agent
 * improvises. The table is therefore a machine interface: its format is declared in the protocol
 * and read here. Terminal states are covered in the other direction, so a new outcome cannot
 * appear without a scenario.
 */
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';
import { loadModels } from '../../scripts/fsm/model.js';
import { loadConfig } from '../../scripts/lib/config.js';
import { assertFloor, walkFiles } from '../../scripts/lib/scan.js';

const HEADER = '| Scenario | Fixture | What the run does | Norm (owner of the answer) |';
const ROW = /^\|.*\|$/;
const SEPARATOR = /^\|[\s-|]+\|$/;
const BACKTICKED = /`([^`]+)`/g;
const CELL_COUNT = 4;
const FIXTURE_COLUMN = 1;
const NORM_COLUMN = 3;
const FIXTURE_EXTENSION = '.html';
const SCENARIO_FLOOR = 1;

const { regression } = loadConfig();

/**
 * Reads the scenario table the protocol declares.
 * @returns {string[][]} Cells of each scenario row.
 */
function readScenarios() {
  const lines = readFileSync(regression.protocol, 'utf8').split('\n');
  const start = lines.indexOf(HEADER);
  assert.ok(start >= 0, 'The scenario table is gone: this guard no longer checks anything.');
  const rows = [];
  for (const line of lines.slice(start + 1)) {
    if (!ROW.test(line)) break;
    if (!SEPARATOR.test(line)) rows.push(line.split('|').slice(1, -1).map((cell) => cell.trim()));
  }
  return rows;
}

/**
 * Lists the backticked words of a table cell.
 * @param {string} cell Table cell.
 * @returns {string[]} Backticked words.
 */
function words(cell) {
  return [...cell.matchAll(BACKTICKED)].map((match) => match[1]);
}

test('every scenario names a fixture that exists and a transition that owns its norm', { skip: !regression }, () => {
  const scenarios = readScenarios();
  assertFloor(scenarios.length, SCENARIO_FLOOR, 'scenarios');
  const transitions = new Set(loadModels().flatMap(({ model }) => model.transitions.map(({ id }) => id)));
  for (const cells of scenarios) {
    assert.equal(cells.length, CELL_COUNT, `Row "${cells[0]}" does not have ${CELL_COUNT} columns.`);
    const fixtures = words(cells[FIXTURE_COLUMN]);
    assertFloor(fixtures.length, 1, `fixtures in "${cells[0]}"`);
    for (const fixture of fixtures) assert.ok(existsSync(join(regression.fixturesDir, fixture)), `${fixture} does not exist.`);
    assert.ok(words(cells[NORM_COLUMN]).some((word) => transitions.has(word)), `"${cells[0]}" names no transition.`);
  }
});

test('every fixture page is used by a scenario', { skip: !regression }, () => {
  const used = new Set(readScenarios().flatMap((cells) => words(cells[FIXTURE_COLUMN])));
  const pages = walkFiles(process.cwd(), [regression.fixturesDir], [FIXTURE_EXTENSION]).map((path) => path.split('/').at(-1));
  assert.deepEqual(pages.filter((page) => !used.has(page)), []);
});

test('every terminal state is reached by a scenario', { skip: !regression }, () => {
  const norms = readScenarios().flatMap((cells) => words(cells[NORM_COLUMN]));
  for (const { model } of loadModels()) {
    const terminal = model.states.filter((state) => state.terminal).map((state) => state.id);
    const reached = new Set(model.transitions.filter(({ id }) => norms.includes(id)).map(({ to }) => to));
    assert.deepEqual(terminal.filter((state) => !reached.has(state)), []);
  }
});
