/**
 * @file A published provider fix reaches a user within an hour.
 *
 * Behaviour tests read the constant, so they stay green at any value: a test that reads a
 * constant does not constrain it. The promise is an inequality, stated here once: more often
 * is allowed, less often is not. The decision built on the constant is held too, since a check
 * that never reports staleness keeps the constant valid and the fix away. This example has no
 * running reader, so what calls that decision is a product's own part and needs its own test.
 */
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { PROVIDER_CONFIG_REFRESH_MS } from '../../src/constants.js';
import { isConfigStale } from '../../src/provider-config.js';

const ONE_HOUR_MS = 3_600_000;

test('the configuration is read at least once an hour', () => {
  assert.ok(PROVIDER_CONFIG_REFRESH_MS > 0, 'The refresh period must be positive.');
  assert.ok(PROVIDER_CONFIG_REFRESH_MS <= ONE_HOUR_MS, `Refresh period ${PROVIDER_CONFIG_REFRESH_MS} ms exceeds one hour.`);
});

test('a configuration an hour old is read again', () => {
  const fetchedAt = 0;
  assert.equal(isConfigStale(fetchedAt, fetchedAt + ONE_HOUR_MS), true);
  assert.equal(isConfigStale(fetchedAt, fetchedAt), false);
});
