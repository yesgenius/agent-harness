/**
 * @file A published provider fix reaches a user within an hour.
 *
 * Behaviour tests read the constant, so they stay green at any value: a test that reads a
 * constant does not constrain it. The promise is an inequality, stated here once: more often
 * is allowed, less often is not.
 */
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { PROVIDER_CONFIG_REFRESH_MS } from '../../src/constants.js';

const ONE_HOUR_MS = 3_600_000;

test('the configuration is read at least once an hour', () => {
  assert.ok(PROVIDER_CONFIG_REFRESH_MS > 0, 'The refresh period must be positive.');
  assert.ok(PROVIDER_CONFIG_REFRESH_MS <= ONE_HOUR_MS, `Refresh period ${PROVIDER_CONFIG_REFRESH_MS} ms exceeds one hour.`);
});
