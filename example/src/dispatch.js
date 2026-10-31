/**
 * @file Sends one reminder through a provider and reports only what was proved.
 *
 * The transition ids in the logs are copied from example/process/reminder.fsm.json; the build
 * compares them.
 */
import { PROOF_POLL_MS, PROOF_TIMEOUT_MS, STATUS } from './constants.js';
import { createLogger } from './logger.js';

const logger = createLogger('Dispatch');

/**
 * Waits for the text to appear in the delivery feed.
 * @param {object} transport Provider transport.
 * @param {string} text Text that was sent.
 * @param {{timeoutMs: number, pollMs: number}} timing Waiting limits.
 * @returns {Promise<boolean>} True when delivery was proved in time.
 */
async function waitForProof(transport, text, { timeoutMs, pollMs }) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (await transport.findDelivered(text)) return true;
    await new Promise((resolve) => setTimeout(resolve, pollMs));
  }
  return false;
}

/**
 * Runs the reminder process once.
 * @param {{id: string, text: string, providerId: string}} reminder What to send.
 * @param {object} dependencies Collaborators of the process.
 * @param {object[]} dependencies.providers Provider configuration entries.
 * @param {object} dependencies.journal Durable record: `claimIntent(id)` writes the intent and
 *   resolves true, or resolves false when it already exists. The check and the write are one
 *   atomic step: as two steps, two runs at once would both see nothing and both send.
 * @param {object} dependencies.transport Provider access: `send(request)`, `findDelivered(text)`.
 * @param {{timeoutMs: number, pollMs: number}} [dependencies.timing] Proof waiting limits.
 * @returns {Promise<string>} The final status.
 */
export async function dispatchReminder(reminder, { providers, journal, transport, timing }) {
  const provider = providers.find(({ id }) => id === reminder.providerId);
  if (!provider) {
    logger.error(`[reminder.provider-unknown] ${reminder.id}`);
    return STATUS.FAILED;
  }

  const claimed = await journal.claimIntent(reminder.id);
  if (!claimed) {
    logger.error(`[reminder.duplicate-blocked] ${reminder.id}`);
    return STATUS.DUPLICATE_BLOCKED;
  }
  logger.info(`[reminder.intent-recorded] ${reminder.id}`);

  logger.info(`[reminder.send-started] ${reminder.id}`);
  const outcome = await transport.send({ endpoint: provider.endpoint, text: reminder.text });
  if (!outcome.accepted) {
    logger.error(`[reminder.send-refused] ${reminder.id}`);
    return STATUS.FAILED;
  }
  logger.info(`[reminder.send-accepted] ${reminder.id}`);

  const limits = timing ?? { timeoutMs: PROOF_TIMEOUT_MS, pollMs: PROOF_POLL_MS };
  if (await waitForProof(transport, reminder.text, limits)) {
    logger.info(`[reminder.delivery-confirmed] ${reminder.id}`);
    return STATUS.CONFIRMED;
  }
  logger.error(`[reminder.delivery-unproven] ${reminder.id}`);
  return STATUS.UNCONFIRMED;
}
