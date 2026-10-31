/**
 * @file Behaviour of the reminder process.
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { STATUS } from '../src/constants.js';
import { dispatchReminder } from '../src/dispatch.js';

const { providers } = JSON.parse(readFileSync('example/config/providers.json', 'utf8'));
const TIMING = { timeoutMs: 20, pollMs: 2 };
const REMINDER = { id: 'r1', text: 'hello', providerId: providers[0].id };

/** @returns {object} A journal kept in memory. */
function memoryJournal() {
  const ids = new Set();
  return {
    async claimIntent(id) {
      if (ids.has(id)) return false;
      ids.add(id);
      return true;
    },
  };
}

/**
 * @param {{accepted: boolean, delivered: boolean}} behaviour How the fake provider acts.
 * @returns {object} A transport counting its sends.
 */
function fakeTransport({ accepted, delivered }) {
  return {
    sends: 0,
    async send() { this.sends += 1; return { accepted }; },
    async findDelivered() { return delivered; },
  };
}

test('a delivered reminder finishes confirmed', async () => {
  const transport = fakeTransport({ accepted: true, delivered: true });
  const status = await dispatchReminder(REMINDER, { providers, journal: memoryJournal(), transport, timing: TIMING });
  assert.equal(status, STATUS.CONFIRMED);
});

test('an accepted reminder with no proof is never reported as delivered', async () => {
  const transport = fakeTransport({ accepted: true, delivered: false });
  const status = await dispatchReminder(REMINDER, { providers, journal: memoryJournal(), transport, timing: TIMING });
  assert.equal(status, STATUS.UNCONFIRMED);
});

test('a refused reminder finishes failed', async () => {
  const transport = fakeTransport({ accepted: false, delivered: false });
  const status = await dispatchReminder(REMINDER, { providers, journal: memoryJournal(), transport, timing: TIMING });
  assert.equal(status, STATUS.FAILED);
});

test('an unknown provider sends nothing', async () => {
  const transport = fakeTransport({ accepted: true, delivered: true });
  const status = await dispatchReminder({ ...REMINDER, providerId: 'absent' }, { providers, journal: memoryJournal(), transport, timing: TIMING });
  assert.equal(status, STATUS.FAILED);
  assert.equal(transport.sends, 0);
});

test('two runs of the same reminder at once send it once', async () => {
  const transport = fakeTransport({ accepted: true, delivered: true });
  const journal = memoryJournal();
  const statuses = await Promise.all([
    dispatchReminder(REMINDER, { providers, journal, transport, timing: TIMING }),
    dispatchReminder(REMINDER, { providers, journal, transport, timing: TIMING }),
  ]);
  assert.deepEqual(statuses.sort(), [STATUS.CONFIRMED, STATUS.DUPLICATE_BLOCKED].sort());
  assert.equal(transport.sends, 1);
});

test('a second run of the same reminder never sends twice', async () => {
  const transport = fakeTransport({ accepted: true, delivered: true });
  const journal = memoryJournal();
  await dispatchReminder(REMINDER, { providers, journal, transport, timing: TIMING });
  const status = await dispatchReminder(REMINDER, { providers, journal, transport, timing: TIMING });
  assert.equal(status, STATUS.DUPLICATE_BLOCKED);
  assert.equal(transport.sends, 1);
});
