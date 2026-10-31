/**
 * @file Fixture page: stands in for the provider and runs the real process in a browser.
 * The fixture's <body data-behaviour> picks how the fake provider acts.
 */
import { dispatchReminder } from '/src/dispatch.js';

const CONFIG_URL = '/config/providers.json';
const DELIVERY_DELAY_MS = 300;
const REMINDER_ID = 'fixture-reminder';
const BEHAVIOUR = document.body.dataset.behaviour;

const feed = document.querySelector('#feed');
const status = document.querySelector('#status');

const BEHAVIOURS = {
  delivered: { accepted: true, delivers: true, intentExists: false },
  swallowed: { accepted: true, delivers: false, intentExists: false },
  refused: { accepted: false, delivers: false, intentExists: false },
  restarted: { accepted: true, delivers: true, intentExists: true },
};

const behaviour = BEHAVIOURS[BEHAVIOUR];
const recorded = new Set(behaviour.intentExists ? [REMINDER_ID] : []);

const journal = {
  claimIntent: async (id) => {
    if (recorded.has(id)) return false;
    recorded.add(id);
    return true;
  },
};

const transport = {
  send: async ({ text }) => {
    if (behaviour.delivers) {
      setTimeout(() => {
        const item = document.createElement('li');
        item.textContent = text;
        feed.append(item);
      }, DELIVERY_DELAY_MS);
    }
    return { accepted: behaviour.accepted };
  },
  findDelivered: async (text) => [...feed.children].some((item) => item.textContent === text),
};

document.querySelector('#send').addEventListener('click', async () => {
  const { providers } = await (await fetch(CONFIG_URL)).json();
  const reminder = { id: REMINDER_ID, text: document.querySelector('#text').value, providerId: providers[0].id };
  status.textContent = await dispatchReminder(reminder, { providers, journal, transport });
});
