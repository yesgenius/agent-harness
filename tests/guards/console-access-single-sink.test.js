/**
 * @file Console access has a single sink.
 *
 * Without one sink, logs cannot be switched on or filtered in one place, and a run cannot be read
 * afterwards. This guard calls the build step's own function: a private copy of the walk here
 * would let the build and the suite enforce two different rules while both stayed green. The
 * planted fixtures prove the detection itself still works.
 */
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { findConsoleProblems, touchesConsole } from '../../scripts/check-console-routing.js';

test('no module reaches the console past the sink', () => {
  assert.deepEqual(findConsoleProblems(), []);
});

test('the detection sees a console call and ignores a comment or a string', () => {
  assert.equal(touchesConsole('console.log(1)'), true);
  assert.equal(touchesConsole('const c = console; c.log(1)'), true);
  assert.equal(touchesConsole('// console.log(1)'), false);
  assert.equal(touchesConsole("const text = 'console.log';"), false);
});
