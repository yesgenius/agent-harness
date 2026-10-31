/**
 * @file Both agent front-ends offer the same workflows.
 *
 * A workflow exists because reconstructing it by hand is how the process goes wrong. If one
 * front-end carries a step the other lacks, what the product gets depends on which one happens
 * to be open. Bodies and descriptions are compared byte for byte; only the invocation field,
 * which each front-end spells its own way, is compared by meaning.
 */
import assert from 'node:assert/strict';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { test } from 'node:test';
import { assertFloor } from '../../scripts/lib/scan.js';

const FIRST_SKILLS = '.claude/skills';
const SECOND_SKILLS = '.agents/skills';
const SKILL_FILE = 'SKILL.md';
const FIRST_ONLY_LINE = /^disable-model-invocation: true\n/m;
const SECOND_POLICY_FILE = 'agents/openai.yaml';
const SECOND_EXPLICIT_ONLY = 'allow_implicit_invocation: false';
const WORKFLOW_ENTRY = /^- `([a-z-]+)` — /gm;
const INSTRUCTION_FILE = 'AGENTS.md';
const SKILL_FLOOR = 2;

const names = readdirSync(FIRST_SKILLS).sort();

test('both front-ends list the same workflows', () => {
  assertFloor(names.length, SKILL_FLOOR, 'workflows');
  assert.deepEqual(readdirSync(SECOND_SKILLS).sort(), names);
});

test('paired workflows match byte for byte apart from the invocation field', () => {
  for (const name of names) {
    const first = readFileSync(`${FIRST_SKILLS}/${name}/${SKILL_FILE}`, 'utf8');
    const second = readFileSync(`${SECOND_SKILLS}/${name}/${SKILL_FILE}`, 'utf8');
    assert.equal(first.replace(FIRST_ONLY_LINE, ''), second, `${name} differs between the front-ends.`);
  }
});

test('a workflow started only by name stays that way in both front-ends', () => {
  for (const name of names) {
    const first = FIRST_ONLY_LINE.test(readFileSync(`${FIRST_SKILLS}/${name}/${SKILL_FILE}`, 'utf8'));
    const second = readFileSync(`${SECOND_SKILLS}/${name}/${SECOND_POLICY_FILE}`, 'utf8').includes(SECOND_EXPLICIT_ONLY);
    assert.equal(first, second, `${name} has different invocation policies.`);
  }
});

test('every workflow the instructions name exists', () => {
  const listed = [...readFileSync(INSTRUCTION_FILE, 'utf8').matchAll(WORKFLOW_ENTRY)].map((match) => match[1]);
  assertFloor(listed.length, SKILL_FLOOR, 'listed workflows');
  assert.deepEqual(listed.filter((name) => !existsSync(`${FIRST_SKILLS}/${name}/${SKILL_FILE}`)), []);
});
