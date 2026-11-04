/**
 * @file File walking shared by build steps and guards, with the floor that keeps a scan honest.
 */
import { existsSync, readdirSync, statSync } from 'node:fs';
import { extname, join, relative, sep } from 'node:path';

const SKIPPED_DIRECTORIES = new Set(['node_modules', '.git']);

/**
 * Lists files under the given directories.
 * @param {string} root Repository root.
 * @param {string[]} directories Directories relative to the root.
 * @param {string[]} [extensions] Extensions to keep, with the dot; without it every file is kept.
 * @returns {string[]} Sorted paths relative to the root, with forward slashes.
 */
export function walkFiles(root, directories, extensions) {
  const found = [];
  const visit = (absolute) => {
    for (const entry of readdirSync(absolute)) {
      if (SKIPPED_DIRECTORIES.has(entry)) continue;
      const path = join(absolute, entry);
      if (statSync(path).isDirectory()) visit(path);
      else if (!extensions || extensions.includes(extname(entry))) found.push(relative(root, path).split(sep).join('/'));
    }
  };
  for (const directory of directories) {
    const absolute = join(root, directory);
    if (existsSync(absolute)) visit(absolute);
  }
  return found.sort();
}

/**
 * Refuses a scan that read too little. A scan that read nothing finds nothing, and
 * "found nothing" is exactly what a clean result looks like.
 * @param {number} count How many things the scan actually read.
 * @param {number} floor The fewest things it may read and still mean something.
 * @param {string} what What was counted, for the message.
 * @returns {void}
 */
export function assertFloor(count, floor, what) {
  if (count < floor) {
    throw new Error(`Scan floor not met: read ${count} ${what}, expected at least ${floor}. A scan that read nothing is not a clean result.`);
  }
}
