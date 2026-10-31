/**
 * @file The one logging sink of the example. Modules ask it for a tagged logger.
 */

/**
 * Creates a logger whose lines carry the module tag.
 * @param {string} moduleName Tag written as `[ModuleName]`.
 * @returns {{info: (message: string) => void, error: (message: string) => void}} Logger.
 */
export function createLogger(moduleName) {
  const tag = `[${moduleName}]`;
  return {
    info: (message) => console.info(tag, message),
    error: (message) => console.error(tag, message),
  };
}
