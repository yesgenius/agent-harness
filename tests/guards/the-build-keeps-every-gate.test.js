/**
 * @file The build keeps every gate.
 *
 * A zero count of problems means something only while the gate keeps checking what it used to
 * check. Dropping a step from the chain breaks nothing visible: the build gets faster and stays
 * green. The list below is the rule: removing a gate is a decision, made here on purpose.
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const MANIFEST = 'package.json';
const ROOT_SCRIPT = 'build';
const REQUIRED_GATES = [
  'workstation:check',
  'code:syntax',
  'code:console-routing',
  'fsm:lint',
  'fsm:prefixes',
  'fsm:doc',
  'docs:index',
];
const NPM_RUN = /npm run ([\w:-]+)/g;

test('the build reaches every required gate', () => {
  const { scripts } = JSON.parse(readFileSync(MANIFEST, 'utf8'));
  const reached = new Set();
  const visit = (name) => {
    if (reached.has(name)) return;
    reached.add(name);
    for (const [, next] of (scripts[name] ?? '').matchAll(NPM_RUN)) visit(next);
  };
  visit(ROOT_SCRIPT);
  assert.deepEqual(REQUIRED_GATES.filter((gate) => !reached.has(gate)), []);
});

test('no gate is switched off by an always-true tail', () => {
  const { scripts } = JSON.parse(readFileSync(MANIFEST, 'utf8'));
  const weakened = REQUIRED_GATES.filter((gate) => /\|\|\s*true|;\s*true|--no-/.test(scripts[gate] ?? ''));
  assert.deepEqual(weakened, []);
});
