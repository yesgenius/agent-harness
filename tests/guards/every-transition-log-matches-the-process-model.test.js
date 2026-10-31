/**
 * @file Every transition log matches the process model.
 *
 * The product reads a broken run from its log, line by line against the model, without reading
 * code. A renamed transition, or a model that allows an irreversible step before a durable record,
 * breaks that reading with no failing behaviour test.
 */
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { findLoggedIds, findPrefixProblems } from '../../scripts/fsm/fsm-log-prefixes.js';
import { lintModel, loadModels } from '../../scripts/fsm/model.js';

const PREFIX = /^['"`]\[(demo\.[a-z-]+)\]/;
const LOGGED = ['demo.step'];

test('a log call counts however it is spaced, its text inside a pattern does not', () => {
  assert.deepEqual(findLoggedIds("logger.info('[demo.step] sent');", PREFIX), LOGGED);
  assert.deepEqual(findLoggedIds("logger.info ('[demo.step] sent');", PREFIX), LOGGED);
  assert.deepEqual(findLoggedIds("logger.info /* why */ ('[demo.step] sent');", PREFIX), LOGGED);
  assert.deepEqual(findLoggedIds("const unused = /logger.info('[demo.step] sent')/;", PREFIX), []);
});

test('every declared model is well formed', () => {
  assert.deepEqual(loadModels().flatMap(({ model }) => lintModel(model)), []);
});

test('logs and models use the same names', () => {
  assert.deepEqual(findPrefixProblems(), []);
});
