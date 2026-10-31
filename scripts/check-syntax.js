/**
 * @file Parses every JavaScript file of the declared roots without running it.
 *
 * Each declared root must yield a file: a root that was renamed or removed is otherwise skipped,
 * and a syntax check that reads nothing there reports exactly what a clean tree reports.
 */
import { spawnSync } from 'node:child_process';
import { loadConfig } from './lib/config.js';
import { assertFloor, walkFiles } from './lib/scan.js';

const SCANNED_EXTENSIONS = ['.js', '.mjs', '.cjs'];
const FILE_FLOOR = 1;
const ROOT_FLOOR = 1;
const FAILURE_EXIT = 1;

const root = process.cwd();
const { syntaxRoots } = loadConfig(root);
assertFloor(syntaxRoots.length, ROOT_FLOOR, 'syntax roots');
for (const directory of syntaxRoots) {
  assertFloor(walkFiles(root, [directory], SCANNED_EXTENSIONS).length, FILE_FLOOR, `JavaScript files in ${directory}`);
}
const files = walkFiles(root, syntaxRoots, SCANNED_EXTENSIONS);
const failed = files.filter((file) => {
  const result = spawnSync(process.execPath, ['--check', file], { stdio: 'inherit' });
  return result.status !== 0;
});
if (failed.length > 0) process.exitCode = FAILURE_EXIT;
else process.stdout.write(`syntax: ${files.length} files parsed\n`);
