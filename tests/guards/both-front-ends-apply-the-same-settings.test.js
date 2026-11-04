/**
 * @file Both agent front-ends apply the same settings.
 *
 * Settings are spelled differently per front-end, so they are compared by meaning. The danger is
 * the quiet half: a command refused in one front-end and allowed in the other, or a key that
 * landed inside a TOML table, where it stays valid and does nothing. A browser tool that one front-end
 * runs freely and the other asks about is a quiet half too: the remembered answer lands in a tracked
 * file and stops the next workflow on a change nobody asked for.
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { assertFloor } from '../../scripts/lib/scan.js';

const FIRST_SETTINGS = '.claude/settings.json';
const MCP_DECLARATION = '.mcp.json';
const SECOND_CONFIG = '.codex/config.toml';
const SECOND_RULES = '.codex/rules/project.rules';
const IGNORE_FILE = '.gitignore';
const SECRET_FILE = '.env';
const BROWSER_SERVER = 'chrome-devtools';
const DENIED_COMMAND = /^Bash\((.+) \*\)$/;
const FORBIDDEN_RULE = /pattern = \[([^\]]+)\],\s*decision = "forbidden"/g;
const QUOTED_WORD = /"([^"]+)"/g;
const TOP_LEVEL_KEYS = ['approval_policy', 'sandbox_mode', 'project_doc_fallback_filenames', 'model_reasoning_effort'];
const FIRST_TABLE = /^\[/m;
const PINNED_PACKAGE = /@\d+\.\d+\.\d+$/;
const TOML_COMMAND = /^[ \t]*command[ \t]*=[ \t]*"([^"]+)"/m;
const TOML_ARGS = /^[ \t]*args[ \t]*=[ \t]*\[([\s\S]*?)\]/m;
const DENY_FLOOR = 4;
const FIRST_BROWSER_PERMISSION = `mcp__${BROWSER_SERVER}`;
// A table header, with the spaces and quotes TOML allows around its parts.
const TABLE_HEADER = /^[ \t]*\[([^\]\n]+)\][ \t]*(?:#.*)?$/gm;
const NAME_NOISE = /[\s"]/g;
const SERVER_TABLE_PREFIX = 'mcp_servers.';
const OWN_TABLES = ['features'];
const SERVER_WIDE_APPROVAL = /^[ \t]*default_tools_approval_mode[ \t]*=[ \t]*"approve"[ \t]*(?:#.*)?$/m;
// A remembered per-tool answer inside a server table: a dotted `tools.<name>` key or a `tools` table.
const TOOLS_KEY = /^[ \t]*"?tools"?[ \t]*[.=]/m;

const settings = JSON.parse(readFileSync(FIRST_SETTINGS, 'utf8'));
const config = readFileSync(SECOND_CONFIG, 'utf8');
const declaredServers = Object.keys(JSON.parse(readFileSync(MCP_DECLARATION, 'utf8')).mcpServers);

/**
 * Splits a TOML text into its tables.
 * @param {string} text TOML text.
 * @returns {Array<{name: string, body: string}>} Each table's dotted name, without spaces and
 *   quotes, and the text up to the next table.
 */
function tablesOf(text) {
  const headers = [...text.matchAll(TABLE_HEADER)];
  return headers.map((header, index) => ({
    name: header[1].replace(NAME_NOISE, ''),
    body: text.slice(header.index + header[0].length, headers[index + 1]?.index ?? text.length),
  }));
}

/**
 * Reads the table of one server from the second front-end's configuration.
 * @param {string} server Server name.
 * @returns {string} The table's text.
 */
function serverTable(server) {
  const table = tablesOf(config).find(({ name }) => name === `${SERVER_TABLE_PREFIX}${server}`);
  assert.ok(table, `${SECOND_CONFIG} has no [${SERVER_TABLE_PREFIX}${server}] table.`);
  return table.body;
}

test('every command denied in one front-end is forbidden in the other', () => {
  const denied = settings.permissions.deny.map((rule) => DENIED_COMMAND.exec(rule)?.[1]).filter(Boolean).sort();
  assertFloor(denied.length, DENY_FLOOR, 'denied commands');
  const rules = readFileSync(SECOND_RULES, 'utf8');
  const forbidden = [...rules.matchAll(FORBIDDEN_RULE)]
    .map((match) => [...match[1].matchAll(QUOTED_WORD)].map((word) => word[1]).join(' '))
    .sort();
  assert.deepEqual(forbidden, denied);
});

test('both front-ends start the browser server the same way', () => {
  const first = JSON.parse(readFileSync(MCP_DECLARATION, 'utf8')).mcpServers[BROWSER_SERVER];
  const table = serverTable(BROWSER_SERVER);
  const secondArgs = [...(TOML_ARGS.exec(table)?.[1] ?? '').matchAll(QUOTED_WORD)].map((match) => match[1]);
  assert.equal(TOML_COMMAND.exec(table)?.[1], first.command);
  assert.deepEqual(secondArgs, first.args);
});

test('the browser server version is pinned', () => {
  const firstArgs = JSON.parse(readFileSync(MCP_DECLARATION, 'utf8')).mcpServers[BROWSER_SERVER].args;
  assert.ok(firstArgs.some((argument) => PINNED_PACKAGE.test(argument)), 'An unpinned tool changes under a finished project.');
});

test('top-level keys stand above the first table', () => {
  const head = config.slice(0, config.search(FIRST_TABLE));
  assert.deepEqual(TOP_LEVEL_KEYS.filter((key) => !head.includes(`${key} =`)), []);
});

test('both front-ends run every browser tool without a prompt', () => {
  assert.ok(settings.permissions.allow.includes(FIRST_BROWSER_PERMISSION), `${FIRST_SETTINGS} must allow ${FIRST_BROWSER_PERMISSION}.`);
  assert.match(serverTable(BROWSER_SERVER), SERVER_WIDE_APPROVAL, `${SECOND_CONFIG} must approve every tool of the browser server in its own table: a prompt per tool writes the remembered answer into this tracked file.`);
});

test('the second front-end configuration holds only what the project declares', () => {
  const declared = [...OWN_TABLES, ...declaredServers.map((server) => `${SERVER_TABLE_PREFIX}${server}`)];
  const tables = tablesOf(config);
  const extra = tables.filter(({ name }) => !declared.includes(name)).map(({ name }) => name);
  const remembered = tables.filter(({ body }) => TOOLS_KEY.test(body)).map(({ name }) => name);
  const message = `${SECOND_CONFIG} holds a table or a per-tool answer the project never declared: most likely an approval the agent remembered while working. The server-wide approval covers it; remove it.`;
  assert.deepEqual(extra, [], message);
  assert.deepEqual(remembered, [], message);
});

test('automatic memory is off in both front-ends', () => {
  assert.equal(settings.autoMemoryEnabled, false);
  assert.match(config, /^memories = false$/m);
});

test('the secret file stays out of history', () => {
  assert.ok(readFileSync(IGNORE_FILE, 'utf8').split('\n').includes(SECRET_FILE));
});
