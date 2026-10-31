/**
 * @file A spec reference points at the source of truth.
 *
 * Agents follow references literally. A reference to a moved or deleted file sends them to guess,
 * and it fails silently: every document still reads fine. Every path named in the instructions,
 * workflows and specifications must exist.
 */
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { test } from 'node:test';
import { assertFloor, walkFiles } from '../../scripts/lib/scan.js';

const SCANNED_DIRECTORIES = ['docs/specs', '.claude/skills'];
const INSTRUCTION_FILE = 'AGENTS.md';
const REFERENCE = /`((?:docs|scripts|tests|example|\.githooks|\.claude|\.codex|\.agents)\/[^`\s*<>]+\.[a-z]+)`/g;
const REFERENCE_FLOOR = 5;

test('every referenced path exists', () => {
  const files = [INSTRUCTION_FILE, ...walkFiles(process.cwd(), SCANNED_DIRECTORIES, ['.md'])];
  const references = files.flatMap((file) =>
    [...readFileSync(file, 'utf8').matchAll(REFERENCE)].map((match) => ({ file, path: match[1] })));
  assertFloor(references.length, REFERENCE_FLOOR, 'references');
  const dead = references.filter(({ path }) => !existsSync(path)).map(({ file, path }) => `${file} -> ${path}`);
  assert.deepEqual(dead, []);
});
