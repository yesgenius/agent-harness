/**
 * @file The runtime pin is a long-term support line.
 *
 * When the build stops on a machine that runs another Node, the quick way to green is to write the
 * running version into the version file. The build passes, and from then on every new user installs
 * what one machine happened to have. Node gives long-term support only to even major lines; an odd
 * line stops getting security fixes within months of its release, so a pin to it hands new users
 * an unsupported runtime. This guard refuses an odd or malformed pin. It cannot tell an even line
 * whose support has already ended: that needs the release schedule, and a person checks it when
 * raising the pin.
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { NODE_VERSION_FILE } from '../../scripts/lib/entry.js';

const MAJOR_ONLY = /^\d+$/;
const LTS_PARITY = 2;
const EVEN = 0;

test('the version file pins one even major line of Node', () => {
  const pin = readFileSync(NODE_VERSION_FILE, 'utf8').trim();
  assert.match(pin, MAJOR_ONLY, `${NODE_VERSION_FILE} must hold one major version, for example 26.`);
  assert.equal(Number(pin) % LTS_PARITY, EVEN, `${NODE_VERSION_FILE} pins Node ${pin}, an odd line that never gets long-term support. Pin an even line; if this machine runs another Node, fix the machine (npm run workstation:check says how).`);
});
