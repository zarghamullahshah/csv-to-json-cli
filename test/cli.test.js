'use strict';

const assert = require('node:assert/strict');
const { test } = require('node:test');
const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const CLI = path.join(__dirname, '..', 'src', 'cli.js');

function runCli(args, input) {
  return spawnSync(process.execPath, [CLI, ...args], { input, encoding: 'utf8' });
}

test('cli: converts CSV from stdin to compact JSON', () => {
  const result = runCli([], 'name,age\nAda,36\n');
  assert.equal(result.status, 0);
  assert.equal(result.stdout, '[{"name":"Ada","age":36}]\n');
});

test('cli: --ndjson emits one object per line', () => {
  const result = runCli(['--ndjson'], 'a,b\n1,2\n3,4\n');
  assert.equal(result.status, 0);
  assert.equal(result.stdout, '{"a":1,"b":2}\n{"a":3,"b":4}\n');
});

test('cli: --no-coerce keeps values as strings', () => {
  const result = runCli(['--no-coerce'], 'a,b\n1,true\n');
  assert.equal(result.stdout, '[{"a":"1","b":"true"}]\n');
});

test('cli: reads from a file argument', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'csv-to-json-'));
  const file = path.join(dir, 'in.csv');
  fs.writeFileSync(file, 'x,y\n9,8\n');
  const result = runCli([file]);
  assert.equal(result.status, 0);
  assert.equal(result.stdout, '[{"x":9,"y":8}]\n');
  fs.rmSync(dir, { recursive: true, force: true });
});

test('cli: malformed CSV exits non-zero with an error message', () => {
  const result = runCli([], 'a,b\n"oops,1\n');
  assert.equal(result.status, 1);
  assert.match(result.stderr, /Unterminated quoted field/);
});

test('cli: unknown option exits 2 and shows usage', () => {
  const result = runCli(['--bogus']);
  assert.equal(result.status, 2);
  assert.match(result.stderr, /Unknown option/);
  assert.match(result.stderr, /Usage: csv-to-json/);
});

test('cli: --help exits 0 and prints usage', () => {
  const result = runCli(['--help']);
  assert.equal(result.status, 0);
  assert.match(result.stdout, /Usage: csv-to-json/);
});

test('cli: --pretty produces valid indented JSON (2 spaces by default)', () => {
  const result = runCli(['--pretty'], 'name,age\nAda,36\n');
  assert.equal(result.status, 0);
  assert.equal(result.stdout, '[\n  {\n    "name": "Ada",\n    "age": 36\n  }\n]\n');
  assert.deepEqual(JSON.parse(result.stdout), [{ name: 'Ada', age: 36 }]);
});

test('cli: --pretty --indent 4 produces 4-space indent', () => {
  const result = runCli(['--pretty', '--indent', '4'], 'name,age\nAda,36\n');
  assert.equal(result.status, 0);
  assert.equal(result.stdout, '[\n    {\n        "name": "Ada",\n        "age": 36\n    }\n]\n');
  assert.deepEqual(JSON.parse(result.stdout), [{ name: 'Ada', age: 36 }]);
});

test('cli: --indent without --pretty leaves output compact', () => {
  const result = runCli(['--indent', '4'], 'name,age\nAda,36\n');
  assert.equal(result.status, 0);
  assert.equal(result.stdout, '[{"name":"Ada","age":36}]\n');
});

test('cli: --indent with a bad value exits 2 and shows usage', () => {
  const result = runCli(['--indent', 'abc']);
  assert.equal(result.status, 2);
  assert.match(result.stderr, /--indent needs an integer between 0 and 10/);
  assert.match(result.stderr, /Usage: csv-to-json/);
});
