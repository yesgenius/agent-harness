/**
 * @file The commit identity has one source.
 *
 * A wrong commit identity raises no error. Setting it inside a workflow covers only the author:
 * the committer still comes from the machine, so the history carries two identities and nobody
 * notices. The identity is declared once in harness.config.json and installed once.
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { assertFloor, walkFiles } from '../../scripts/lib/scan.js';

const SCANNED_DIRECTORIES = ['.claude/skills', '.agents/skills'];
const IDENTITY_SETTING = /user\.(name|email)|--author|GIT_(AUTHOR|COMMITTER)_/;
const FILE_FLOOR = 2;

test('no workflow sets a commit identity', () => {
  const files = walkFiles(process.cwd(), SCANNED_DIRECTORIES, ['.md']);
  assertFloor(files.length, FILE_FLOOR, 'workflow files');
  assert.deepEqual(files.filter((file) => IDENTITY_SETTING.test(readFileSync(file, 'utf8'))), []);
});
