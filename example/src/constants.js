/**
 * @file Named values of the example process.
 */

/** How often a published provider fix is picked up. A guard caps it at one hour. */
export const PROVIDER_CONFIG_REFRESH_MS = 3_600_000;

/** How long delivery proof is awaited before the outcome is reported as unproven. */
export const PROOF_TIMEOUT_MS = 6_000;

/** Pause between two looks at the delivery feed. */
export const PROOF_POLL_MS = 250;

/** Every status a reminder can finish with. */
export const STATUS = Object.freeze({
  CONFIRMED: 'confirmed',
  UNCONFIRMED: 'unconfirmed',
  FAILED: 'failed',
  DUPLICATE_BLOCKED: 'duplicate-blocked',
});
