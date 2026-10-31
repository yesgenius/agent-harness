/**
 * @file Both agent front-ends apply the same settings.
 *
 * Settings are spelled differently per front-end, so they are compared by meaning. The danger is
 * the quiet half: a command refused in one front-end and allowed in the other, or a key that
 * landed inside a TOML table, where it stays valid and does nothing.
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
const TOML_COMMAND = /\[mcp_servers\.chrome-devtools\][\s\S]*?command = "([^"]+)"/;
const TOML_ARGS = /\[mcp_servers\.chrome-devtools\][\s\S]*?args = \[([\s\S]*?)\]/;
const DENY_FLOOR = 4;

const settings = JSON.parse(readFileSync(FIRST_SETTINGS, 'utf8'));
const config = readFileSync(SECOND_CONFIG, 'utf8');

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
  const secondArgs = [...TOML_ARGS.exec(config)[1].matchAll(QUOTED_WORD)].map((match) => match[1]);
  assert.equal(TOML_COMMAND.exec(config)[1], first.command);
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

test('automatic memory is off in both front-ends', () => {
  assert.equal(settings.autoMemoryEnabled, false);
  assert.match(config, /^memories = false$/m);
});

test('the secret file stays out of reach and out of history', () => {
  assert.ok(settings.permissions.deny.includes(`Read(${SECRET_FILE})`));
  assert.ok(readFileSync(IGNORE_FILE, 'utf8').split('\n').includes(SECRET_FILE));
});
