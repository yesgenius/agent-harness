/**
 * @file Both agent front-ends share one instruction file.
 *
 * Two copies of the instructions drift: each change has to land twice, and the forgotten half
 * raises no error. A shadow file is worse, because a front-end reads it instead of the shared
 * file or on top of it and nothing reports that. The disk is checked, not the index, because
 * the most likely shadow file is git-ignored.
 */
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { test } from 'node:test';
import { loadConfig } from '../../scripts/lib/config.js';
import { assertFloor, walkFiles } from '../../scripts/lib/scan.js';

const SHADOW_FILES = ['CLAUDE.md', 'CLAUDE.local.md', '.claude/CLAUDE.md', '.claude/AGENTS.md', 'AGENTS.override.md'];
const NESTED_NAMES = ['AGENTS.md', 'CLAUDE.md', 'AGENTS.override.md', 'CLAUDE.local.md'];
const REQUIRED_SECTIONS = [
  '## HARD PROHIBITIONS',
  '## Before ANY code task',
  '## Verification model',
  '## Autonomy and approval',
  '## Workflow entry points',
];
const CODEX_CONFIG = '.codex/config.toml';
const EMPTY_FALLBACK = /^project_doc_fallback_filenames = \[\]$/m;
const WHOLE_TREE = ['.'];
const FILE_FLOOR = 10;

test('no shadow instruction file exists at the root', () => {
  assert.deepEqual(SHADOW_FILES.filter((file) => existsSync(file)), []);
});

test('no nested instruction file exists', () => {
  const files = walkFiles(process.cwd(), WHOLE_TREE, ['.md']);
  assertFloor(files.length, FILE_FLOOR, 'Markdown files');
  const nested = files.filter((file) => file.includes('/') && NESTED_NAMES.includes(file.split('/').at(-1)));
  assert.deepEqual(nested, []);
});

test('no fallback file name is declared', () => {
  assert.match(readFileSync(CODEX_CONFIG, 'utf8'), EMPTY_FALLBACK);
});

test('the instruction file keeps its required sections', () => {
  const text = readFileSync(loadConfig().instructionFile, 'utf8');
  assert.deepEqual(REQUIRED_SECTIONS.filter((section) => !text.includes(section)), []);
});
