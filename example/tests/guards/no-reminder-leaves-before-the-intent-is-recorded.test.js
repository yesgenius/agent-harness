/**
 * @file No reminder leaves before the intent is recorded.
 *
 * The failure is a restart between the send and the record: the process comes back, finds no
 * record and sends again. An ordinary run ends the same way whichever comes first, so its final
 * status proves nothing. This guard runs the process with a transport that looks at the journal
 * at the moment of sending: the record must already be there. The journal finishes its write only
 * after a pause, so a record that was started but not awaited is caught as well.
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { dispatchReminder } from '../../src/dispatch.js';

const { providers } = JSON.parse(readFileSync('example/config/providers.json', 'utf8'));
const TIMING = { timeoutMs: 20, pollMs: 2 };
const REMINDER = { id: 'r1', text: 'hello', providerId: providers[0].id };
const EXPECTED_SENDS = 1;

/** @returns {object} A journal whose write lands only after a pause, as a durable write does. */
function slowJournal() {
  const recorded = new Set();
  return {
    recorded,
    claimIntent(id) {
      return new Promise((resolve) => setTimeout(() => {
        if (recorded.has(id)) return resolve(false);
        recorded.add(id);
        return resolve(true);
      }));
    },
  };
}

/**
 * @param {object} journal The journal the transport looks at.
 * @returns {object} A transport that notes, at each send, whether the intent was already recorded.
 */
function witnessTransport(journal) {
  return {
    recordedAtSend: [],
    async send() {
      this.recordedAtSend.push(journal.recorded.has(REMINDER.id));
      return { accepted: true };
    },
    async findDelivered() { return true; },
  };
}

test('the intent is recorded and awaited before the send', async () => {
  const journal = slowJournal();
  const transport = witnessTransport(journal);
  const failure = await dispatchReminder(REMINDER, { providers, journal, transport, timing: TIMING })
    .then(() => null, (error) => error);
  assert.equal(
    transport.recordedAtSend.length,
    EXPECTED_SENDS,
    `The reminder was not sent once (${failure ?? 'no error'}): this guard no longer checks anything.`,
  );
  assert.deepEqual(transport.recordedAtSend, [true], 'The send comes before the record.');
});
