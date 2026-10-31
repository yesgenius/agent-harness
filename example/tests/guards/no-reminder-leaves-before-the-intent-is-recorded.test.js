/**
 * @file No reminder leaves before the intent is recorded.
 *
 * The failure is a restart between the send and the record: the process comes back, finds no
 * record and sends again. A behaviour test stays green with the two lines swapped, because a
 * run with no restart in that gap ends the same way. The order is therefore read in the source.
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const SOURCE = 'example/src/dispatch.js';
const RECORD_CALL = 'await journal.claimIntent(';
const SEND_CALL = 'await transport.send(';

test('the intent is recorded and awaited before the send', () => {
  const source = readFileSync(SOURCE, 'utf8');
  const record = source.indexOf(RECORD_CALL);
  const send = source.indexOf(SEND_CALL);
  assert.ok(record >= 0, `${RECORD_CALL} is gone: this guard no longer checks anything.`);
  assert.ok(send >= 0, `${SEND_CALL} is gone: this guard no longer checks anything.`);
  assert.ok(record < send, 'The send comes before the record.');
});
