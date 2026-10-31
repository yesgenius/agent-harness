/**
 * @file No provider name outlives the provider config.
 *
 * A provider changes its behaviour silently, and a line carrying its name goes on describing
 * what no longer exists. The names are read from the config, so this guard does not become one
 * more place where they are written.
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { assertFloor, walkFiles } from '../../../scripts/lib/scan.js';

const CONFIG = 'example/config/providers.json';
const SCANNED_DIRECTORIES = ['example/src', 'example/tests', 'example/process', 'example/fixtures', 'docs/specs'];
const SCANNED_EXTENSIONS = ['.js', '.json', '.md', '.html'];
const FILE_FLOOR = 5;

test('a provider name appears only in its config', () => {
  const { providers } = JSON.parse(readFileSync(CONFIG, 'utf8'));
  assertFloor(providers.length, 1, 'providers');
  const names = providers.flatMap(({ id, name }) => [id, name]);
  const files = walkFiles(process.cwd(), SCANNED_DIRECTORIES, SCANNED_EXTENSIONS);
  assertFloor(files.length, FILE_FLOOR, 'files');
  const offenders = files.flatMap((file) => {
    const text = readFileSync(file, 'utf8').toLowerCase();
    return names.filter((name) => text.includes(name.toLowerCase())).map((name) => `${file}: ${name}`);
  });
  assert.deepEqual(offenders, []);
});
