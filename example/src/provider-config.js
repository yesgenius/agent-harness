/**
 * @file Decides when the published provider configuration is read again.
 */
import { PROVIDER_CONFIG_REFRESH_MS } from './constants.js';

/**
 * Tells whether the cached configuration should be read again.
 * @param {number} fetchedAt When it was last read, in milliseconds.
 * @param {number} now Current time in milliseconds.
 * @returns {boolean} True when a fresh read is due.
 */
export function isConfigStale(fetchedAt, now) {
  return now - fetchedAt >= PROVIDER_CONFIG_REFRESH_MS;
}
