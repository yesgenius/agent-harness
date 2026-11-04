/**
 * @file Looks for credentials in the staged change and reports only where they are.
 *
 * A workflow has to learn that a credential is staged before it prints the diff, because the
 * printing is the leak. So this step reads exactly what that diff would print, removed lines and
 * context included, and never writes a value anywhere: a failed read reports only that it failed,
 * because a git error can carry the output it captured. It is a net, not a proof: a credential of
 * an unknown shape passes.
 */
import { execFileSync } from 'node:child_process';
import { isMain } from './lib/entry.js';

const FAILURE_EXIT = 1;
const NUL = '\0';
const MAX_FILE_BYTES = 64 * 1024 * 1024;
const NAMES_COMMAND = ['diff', '--staged', '--name-only', '-z'];
const DIFF_COMMAND = ['--literal-pathspecs', 'diff', '--staged', '--no-color', '--no-ext-diff', '--'];
export const SCAN_FAILED = 'secrets: the staged change could not be read, so it is not checked.';
const SECRET_PATH_KIND = 'credential file';
export const SECRET_PATH = /(?:^|\/)(?:\.env(?:\.(?!example$)[^/]+)?|id_rsa|id_ed25519|credentials\.json|[^/]+\.(?:pem|p12|pfx|key))$/;
const SECRET_SHAPES = [
  { kind: 'private key', pattern: /-----BEGIN [A-Z ]*PRIVATE KEY-----/ },
  { kind: 'prefixed token', pattern: /\b[a-z]{2,5}[-_][A-Za-z0-9]{30,}\b/ },
  { kind: 'assigned secret', pattern: /(?:api[_-]?key|secret|token|password|passwd)["']?\s*[:=]\s*["'][^"'\s]{8,}["']/i },
  { kind: 'environment secret', pattern: /^[-+ ]?\s*(?:export\s+)?[A-Z0-9_]*(?:KEY|SECRET|TOKEN|PASSWORD)[A-Z0-9_]*=\S{8,}/m },
];

/**
 * Runs git and returns its output.
 * @param {string} root Repository root.
 * @param {string[]} args Git arguments.
 * @returns {string} Standard output.
 */
function git(root, args) {
  return execFileSync('git', args, { cwd: root, encoding: 'utf8', stdio: 'pipe', maxBuffer: MAX_FILE_BYTES });
}

/**
 * Finds staged content that looks like a credential.
 * @param {string} root Repository root.
 * @returns {{path: string, kind: string}[]} One entry per finding, never the value.
 */
export function findStagedSecrets(root = process.cwd()) {
  const findings = [];
  for (const path of git(root, NAMES_COMMAND).split(NUL).filter(Boolean)) {
    if (SECRET_PATH.test(path)) {
      findings.push({ path, kind: SECRET_PATH_KIND });
      continue;
    }
    const printed = git(root, [...DIFF_COMMAND, path]);
    for (const { kind, pattern } of SECRET_SHAPES) if (pattern.test(printed)) findings.push({ path, kind });
  }
  return findings;
}

if (isMain(import.meta)) {
  try {
    const findings = findStagedSecrets();
    for (const { path, kind } of findings) process.stderr.write(`secrets: ${path}: ${kind}\n`);
    if (findings.length > 0) process.exitCode = FAILURE_EXIT;
    else process.stdout.write('secrets: ok\n');
  } catch {
    process.stderr.write(`${SCAN_FAILED}\n`);
    process.exitCode = FAILURE_EXIT;
  }
}
