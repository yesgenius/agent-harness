/**
 * @file Parses every JavaScript file of the repository without running it.
 */
import { spawnSync } from 'node:child_process';
import { assertFloor, walkFiles } from './lib/scan.js';

const SCANNED_DIRECTORIES = ['scripts', 'tests', 'example'];
const SCANNED_EXTENSIONS = ['.js'];
const FILE_FLOOR = 1;
const FAILURE_EXIT = 1;

const files = walkFiles(process.cwd(), SCANNED_DIRECTORIES, SCANNED_EXTENSIONS);
assertFloor(files.length, FILE_FLOOR, 'JavaScript files');
const failed = files.filter((file) => {
  const result = spawnSync(process.execPath, ['--check', file], { stdio: 'inherit' });
  return result.status !== 0;
});
if (failed.length > 0) process.exitCode = FAILURE_EXIT;
else process.stdout.write(`syntax: ${files.length} files parsed\n`);
