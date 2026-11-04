/**
 * @file Proves this machine can build the project the way every other machine does.
 *
 * What version control cannot carry — the runtime version, the armed hooks, the commit
 * identity — differs between machines without any error of its own.
 */
import { execFileSync } from 'node:child_process';
import { accessSync, constants, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { loadConfig } from './lib/config.js';
import { isMain, NODE_VERSION_FILE } from './lib/entry.js';

const HOOKS_PATH = '.githooks';
const HOOK_FILES = ['pre-commit', 'pre-push'];
const FAILURE_EXIT = 1;
// The Node version managers this check knows: the variable that names the folder each one keeps,
// the subfolder that holds one directory per version, and the commands that install a line and make
// it the one every new shell starts with. An agent starts a new shell for every command, so a
// selection that lasts one shell (`nvm use`) never reaches the next build.
const VERSION_MANAGERS = [
  {
    name: 'nvm',
    variable: 'NVM_DIR',
    versions: join('versions', 'node'),
    install: (major) => `nvm install ${major}`,
    select: (major) => `nvm alias default ${major} (if another project on this machine needs another line, run each command as nvm exec ${major} <command> instead)`,
  },
  {
    name: 'nvm-windows',
    variable: 'NVM_HOME',
    versions: '',
    install: (major) => `nvm install ${major}`,
    select: (major) => `nvm use ${major} (switches Node for the whole machine and may ask for administrator rights)`,
  },
];
const VERSION_DIRECTORY_PREFIX = 'v';
const VERSION_SEPARATOR = '.';
const LIST_SEPARATOR = '; ';
const INSTALLED_SEPARATOR = ', ';
const MISMATCH_FACT = (actual, expected) => `Node ${actual} is running, ${NODE_VERSION_FILE} declares ${expected}.`;
const NOT_THE_PROJECT = `This is the machine, not the project: never change ${NODE_VERSION_FILE} to the running version.`;
const SELECT_REMEDY = (expected, commands, installed) => `Remedy: make the installed Node ${expected} the one new shells start with (${commands}), then build again. Installed: ${installed}.`;
const INSTALL_REMEDY = (expected, commands) => `Remedy: install Node ${expected} and make it the one new shells start with (${commands}), then build again.`;
const NO_MANAGER_REMEDY = (expected) => `Remedy: no known version manager is set up (nvm; nvm-windows on Windows). Install one, install Node ${expected} with it and make it the one new shells start with. If Node ${expected} is already installed another way, put its bin folder first on PATH for every new shell.`;

/**
 * Reads one local git configuration value.
 * @param {string} key Git configuration key.
 * @returns {string} The value, or an empty string when unset.
 */
function readGitConfig(key) {
  try {
    return execFileSync('git', ['config', '--get', key], { encoding: 'utf8', stdio: 'pipe' }).trim();
  } catch {
    return '';
  }
}

/**
 * Lists the known version managers set up on this machine.
 * @param {NodeJS.ProcessEnv} environment Environment to read.
 * @returns {Array<{name: string, folder: string, install: (major: string) => string, select: (major: string) => string}>}
 *   Each set-up manager with the folder that holds its versions.
 */
export function findVersionManagers(environment = process.env) {
  return VERSION_MANAGERS.flatMap(({ variable, versions, ...manager }) => {
    const home = environment[variable];
    return home ? [{ ...manager, folder: join(home, versions) }] : [];
  });
}

/**
 * Finds installed Node versions of one major line in the folders of the set-up version managers.
 * A folder that is missing or cannot be read holds nothing this check can select, so it counts as
 * empty and the remedy says to install.
 * @param {string} major Major version, for example `26`.
 * @param {Array<{folder: string}>} managers Set-up version managers.
 * @returns {string[]} Folders of the installed versions of that line.
 */
export function findInstalledNode(major, managers) {
  const prefix = `${VERSION_DIRECTORY_PREFIX}${major}${VERSION_SEPARATOR}`;
  return managers.flatMap(({ folder }) => {
    let names;
    try {
      names = readdirSync(folder);
    } catch {
      return [];
    }
    return names.filter((name) => name.startsWith(prefix)).map((name) => join(folder, name));
  });
}

/**
 * Explains a runtime mismatch as a property of the machine and names the commands that fix the
 * machine. Changing the version file to the running version would make every other machine and
 * every new user follow this one, so the explanation says so.
 * @param {string} actual Major version that runs.
 * @param {string} expected Major version the version file declares.
 * @param {Array<{name: string, install: (major: string) => string, select: (major: string) => string}>} managers
 *   Set-up version managers.
 * @param {string[]} installed Folders where the declared line is already installed.
 * @returns {string} One problem line with its remedy.
 */
export function describeNodeMismatch(actual, expected, managers, installed) {
  const selects = managers.map(({ name, select }) => `${name}: ${select(expected)}`).join(LIST_SEPARATOR);
  const installs = managers.map(({ name, install, select }) => `${name}: ${install(expected)}, then ${select(expected)}`).join(LIST_SEPARATOR);
  let remedy = NO_MANAGER_REMEDY(expected);
  if (managers.length > 0) {
    remedy = installed.length > 0 ? SELECT_REMEDY(expected, selects, installed.join(INSTALLED_SEPARATOR)) : INSTALL_REMEDY(expected, installs);
  }
  return `${MISMATCH_FACT(actual, expected)} ${NOT_THE_PROJECT} ${remedy}`;
}

/**
 * Collects every property this machine fails.
 * @param {string} root Repository root.
 * @returns {string[]} One line per failure, each naming its remedy.
 */
export function findWorkstationProblems(root = process.cwd()) {
  const problems = [];
  const expectedNode = readFileSync(join(root, NODE_VERSION_FILE), 'utf8').trim();
  const actualNode = process.versions.node.split('.')[0];
  if (actualNode !== expectedNode) {
    const managers = findVersionManagers();
    problems.push(describeNodeMismatch(actualNode, expectedNode, managers, findInstalledNode(expectedNode, managers)));
  }
  if (readGitConfig('core.hooksPath') !== HOOKS_PATH) {
    problems.push(`git hooks are not armed. Remedy: npm install.`);
  }
  for (const hook of HOOK_FILES) {
    try {
      accessSync(join(root, HOOKS_PATH, hook), constants.X_OK);
    } catch {
      problems.push(`${HOOKS_PATH}/${hook} is not executable. Remedy: chmod +x ${HOOKS_PATH}/${hook}.`);
    }
  }
  const { gitIdentity } = loadConfig(root);
  if (gitIdentity && readGitConfig('user.email') !== gitIdentity.email) {
    problems.push(`The commit identity differs from harness.config.json. Remedy: npm install.`);
  }
  return problems;
}

if (isMain(import.meta)) {
  const problems = findWorkstationProblems();
  for (const problem of problems) process.stderr.write(`workstation: ${problem}\n`);
  if (problems.length > 0) process.exitCode = FAILURE_EXIT;
  else process.stdout.write('workstation: ok\n');
}
