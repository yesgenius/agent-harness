/**
 * @file Every transition log matches the process model.
 *
 * The product reads a broken run from its log, line by line against the model, without reading
 * code. A renamed transition, or a model that allows an irreversible step before a durable record,
 * breaks that reading with no failing behaviour test.
 */
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { findPrefixProblems } from '../../scripts/fsm/fsm-log-prefixes.js';
import { lintModel, loadModels } from '../../scripts/fsm/model.js';

test('every declared model is well formed', () => {
  assert.deepEqual(loadModels().flatMap(({ model }) => lintModel(model)), []);
});

test('logs and models use the same names', () => {
  assert.deepEqual(findPrefixProblems(), []);
});
