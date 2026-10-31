/**
 * @file The index matches the specs.
 *
 * Agents read a section by the line numbers in the index. A spec edited without a rebuild leaves
 * them reading the wrong lines with full confidence. The guard renders with the same function the
 * build uses, so the two cannot disagree about what the index should be.
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { renderIndexes } from '../../scripts/llm-context-map.js';

test('every generated index is current', () => {
  const stale = [...renderIndexes()].filter(([path, content]) => readFileSync(path, 'utf8') !== content).map(([path]) => path);
  assert.deepEqual(stale, [], 'Run npm run build.');
});
