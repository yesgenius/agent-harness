/**
 * @file Tells a script started as a command from one imported by another module.
 */

/** The file that names the Node version the harness runs on. */
export const NODE_VERSION_FILE = '.nvmrc';
const ANSWER_TYPE = 'boolean';

/**
 * Answers whether the module runs as a command. Node answers in `import.meta.main`, the same way
 * for a direct start and a start through a link. A Node that predates it leaves it undefined, and
 * a check that reads undefined as "imported" skips itself and exits 0, so this refuses instead.
 * @param {ImportMeta} meta The calling module's `import.meta`.
 * @returns {boolean} True when the module was started as a command.
 * @throws {Error} When this Node cannot tell; `NODE_VERSION_FILE` names the version the harness runs on.
 */
export function isMain(meta) {
  if (typeof meta.main !== ANSWER_TYPE) {
    throw new Error(`entry: Node ${process.version} cannot tell a command from an import, so no check runs. Use the version in ${NODE_VERSION_FILE}.`);
  }
  return meta.main;
}
