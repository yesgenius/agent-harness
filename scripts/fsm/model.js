/**
 * @file Reads process models and states what makes one well formed.
 *
 * A model is JSON so the harness stays on the standard library; the rules are the point,
 * not the format.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { loadConfig } from '../lib/config.js';

/**
 * Loads every declared process model.
 * @param {string} root Repository root.
 * @returns {{entry: object, model: object}[]} Each declaration with its parsed model.
 */
export function loadModels(root = process.cwd()) {
  return loadConfig(root).processModels.map((entry) => ({
    entry,
    model: JSON.parse(readFileSync(join(root, entry.model), 'utf8')),
  }));
}

/**
 * Lists the states reachable from the initial one.
 * @param {object} model Process model.
 * @returns {Set<string>} Reachable state ids.
 */
function reachableStates(model) {
  const reached = new Set([model.initial]);
  let grew = true;
  while (grew) {
    grew = false;
    for (const { from, to } of model.transitions) {
      if (reached.has(from) && !reached.has(to)) {
        reached.add(to);
        grew = true;
      }
    }
  }
  return reached;
}

/**
 * Checks a model against the structural rules.
 * @param {object} model Process model.
 * @returns {string[]} One line per problem.
 */
export function lintModel(model) {
  const problems = [];
  const states = new Map(model.states.map((state) => [state.id, state]));
  const ids = model.transitions.map((transition) => transition.id);
  if (!states.has(model.initial)) problems.push(`Initial state ${model.initial} is not declared.`);
  for (const id of ids.filter((value, index) => ids.indexOf(value) !== index)) problems.push(`Transition id ${id} is repeated.`);
  for (const { id, from, to, irreversible } of model.transitions) {
    if (!states.has(from)) problems.push(`${id} leaves an undeclared state ${from}.`);
    if (!states.has(to)) problems.push(`${id} enters an undeclared state ${to}.`);
    if (states.get(from)?.terminal) problems.push(`${id} leaves terminal state ${from}.`);
    if (irreversible && !states.get(from)?.durable) problems.push(`Irreversible ${id} starts from ${from}, which is not durably recorded.`);
  }
  const reached = reachableStates(model);
  for (const { id, terminal } of model.states) {
    if (!reached.has(id)) problems.push(`State ${id} is unreachable.`);
    if (!terminal && !model.transitions.some(({ from }) => from === id)) problems.push(`Non-terminal state ${id} has no way out.`);
  }
  return problems;
}
