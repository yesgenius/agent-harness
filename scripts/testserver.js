/**
 * @file Serves the regression fixtures on localhost for the browser lane.
 */
import { createReadStream, existsSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, join, normalize, sep } from 'node:path';
import { loadConfig } from './lib/config.js';

const HOST = '127.0.0.1';
const DEFAULT_PORT = 4173;
const PORT_ARGUMENT = '--port=';
const INDEX_FILE = '/index.html';
const NOT_FOUND = 404;
const OK = 200;
const CONTENT_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
};

const root = process.cwd();
const { regression } = loadConfig(root);
if (!regression) throw new Error('harness.config.json declares no regression: there is nothing to serve.');
const { serve } = regression;
const mounts = Object.entries(serve).sort(([a], [b]) => b.length - a.length);

/**
 * Maps a request path to a file, never leaving the mounted directories.
 * @param {string} urlPath Decoded request path.
 * @returns {string | null} Absolute file path, or null when nothing is served there.
 */
function resolveFile(urlPath) {
  const requested = urlPath.endsWith('/') ? `${urlPath}${INDEX_FILE.slice(1)}` : urlPath;
  const mount = mounts.find(([prefix]) => requested.startsWith(prefix));
  if (!mount) return null;
  const directory = join(root, mount[1]);
  const file = normalize(join(directory, requested.slice(mount[0].length)));
  if (!file.startsWith(directory + sep)) return null;
  return existsSync(file) && statSync(file).isFile() ? file : null;
}

const portArgument = process.argv.find((argument) => argument.startsWith(PORT_ARGUMENT));
const port = portArgument ? Number(portArgument.slice(PORT_ARGUMENT.length)) : DEFAULT_PORT;

createServer((request, response) => {
  const file = resolveFile(decodeURIComponent(new URL(request.url, `http://${HOST}`).pathname));
  if (!file) {
    response.writeHead(NOT_FOUND).end();
    return;
  }
  response.writeHead(OK, { 'Content-Type': CONTENT_TYPES[extname(file)] ?? 'application/octet-stream' });
  createReadStream(file).pipe(response);
}).listen(port, HOST, () => process.stdout.write(`testserver: http://${HOST}:${port}/\n`));
