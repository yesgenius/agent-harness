/**
 * @file Reads the one file that declares what this harness applies to.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const CONFIG_FILE = 'harness.config.json';

/**
 * Loads the harness configuration.
 * @param {string} [root] Repository root.
 * @returns {object} Parsed configuration.
 */
export function loadConfig(root = process.cwd()) {
  return JSON.parse(readFileSync(join(root, CONFIG_FILE), 'utf8'));
}
