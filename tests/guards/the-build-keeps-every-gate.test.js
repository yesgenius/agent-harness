/**
 * @file The build keeps every gate.
 *
 * A zero count of problems means something only while the gate keeps checking what it used to
 * check. A step dropped from the chain, replaced by a command that does nothing or hidden behind
 * an always-true tail breaks nothing visible: the build gets faster and stays green. Reading the
 * script text cannot see that, so each gate's rule is broken in a copy and the whole build must
 * notice. The lists below are the rule: removing a gate is a decision, made here on purpose.
 */
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';
import { loadConfig } from '../../scripts/lib/config.js';
import { copyRepository } from '../../scripts/lib/plant-runner.js';

const INSTALL_SCRIPT = 'scripts/install-hooks.js';
const STALE_TEXT = 'stale on purpose\n';
const IMPOSSIBLE_NODE = '0\n';
const BROKEN_SYNTAX = 'function (\n';
const DIRECT_CONSOLE_CALL = 'console.info(1);\n';
const ABSENT_STATE = 'absent-state';
const UNLOGGED_SUFFIX = '.never-logged';
const INDEX_FILE = 'README.md';

const { indexDir, logging, processModels, syntaxRoots } = loadConfig();
const [firstModel] = processModels;

/**
 * Runs a step in a throwaway copy armed the way an installed repository is.
 * @param {(directory: string) => void} step What to do in the copy.
 * @returns {void}
 */
function inArmedCopy(step) {
  const directory = copyRepository(process.cwd());
  try {
    spawnSync('git', ['init', '-q'], { cwd: directory });
    spawnSync(process.execPath, [INSTALL_SCRIPT], { cwd: directory, stdio: 'pipe' });
    step(directory);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
}

/**
 * Runs the whole build.
 * @param {string} directory Copy to build.
 * @returns {boolean} True when the build passed.
 */
function buildPasses(directory) {
  return spawnSync('npm', ['run', 'build'], { cwd: directory, stdio: 'pipe' }).status === 0;
}

/**
 * Rewrites the process model of a copy.
 * @param {string} directory Copy to change.
 * @param {(model: object) => void} change Change to the parsed model.
 * @returns {void}
 */
function changeModel(directory, change) {
  const path = join(directory, firstModel.model);
  const model = JSON.parse(readFileSync(path, 'utf8'));
  change(model);
  writeFileSync(path, JSON.stringify(model));
}

/** Gates that must refuse: each breaks only the rule of the gate it names. */
const REFUSING_GATES = [
  { gate: 'workstation:check', breakRule: (directory) => writeFileSync(join(directory, '.nvmrc'), IMPOSSIBLE_NODE) },
  { gate: 'code:syntax', breakRule: (directory) => writeFileSync(join(directory, syntaxRoots[0], 'broken-on-purpose.js'), BROKEN_SYNTAX) },
  { gate: 'code:console-routing', breakRule: (directory) => writeFileSync(join(directory, logging.sourceRoots[0], 'reaches-the-console.js'), DIRECT_CONSOLE_CALL) },
  {
    gate: 'fsm:lint',
    needsModel: true,
    breakRule: (directory) => changeModel(directory, (model) => {
      model.transitions[0].from = ABSENT_STATE;
    }),
  },
  {
    gate: 'fsm:prefixes',
    needsModel: true,
    breakRule: (directory) => changeModel(directory, (model) => {
      model.transitions.push({ ...model.transitions[0], id: `${model.transitions[0].id}${UNLOGGED_SUFFIX}` });
    }),
  },
];

/** Gates that must rewrite: a stale generated file does not survive them. */
const REGENERATING_GATES = [
  { gate: 'fsm:doc', needsModel: true, generated: firstModel?.doc },
  { gate: 'docs:index', generated: `${indexDir}/${INDEX_FILE}` },
];

test('a clean copy builds, so every refusal below means what it says', () => {
  inArmedCopy((directory) => assert.ok(buildPasses(directory)));
});

for (const { gate, needsModel, breakRule } of REFUSING_GATES) {
  test(`the build refuses what ${gate} checks`, { skip: needsModel && !firstModel }, () => {
    inArmedCopy((directory) => {
      breakRule(directory);
      assert.equal(buildPasses(directory), false);
    });
  });
}

for (const { gate, needsModel, generated } of REGENERATING_GATES) {
  test(`the build rewrites what ${gate} generates`, { skip: needsModel && !firstModel }, () => {
    inArmedCopy((directory) => {
      const path = join(directory, generated);
      writeFileSync(path, STALE_TEXT);
      assert.ok(buildPasses(directory));
      assert.notEqual(readFileSync(path, 'utf8'), STALE_TEXT);
    });
  });
}
