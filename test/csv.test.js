'use strict';

const assert = require('node:assert/strict');
const { test } = require('node:test');
const { parseRows, parseCsv, coerceValue } = require('../src/csv');

test('parseRows: simple rows and CRLF endings', () => {
  assert.deepEqual(parseRows('a,b,c\r\n1,2,3\r\n'), [['a', 'b', 'c'], ['1', '2', '3']]);
});

test('parseRows: quoted fields with commas, quotes and newlines', () => {
  const text = 'name,note\n"Doe, Jane","said ""hi""\nsecond line"';
  assert.deepEqual(parseRows(text), [
    ['name', 'note'],
    ['Doe, Jane', 'said "hi"\nsecond line'],
  ]);
});

test('parseRows: custom delimiter and blank lines skipped', () => {
  assert.deepEqual(parseRows('a;b\n\n1;2\n', { delimiter: ';' }), [['a', 'b'], ['1', '2']]);
});

test('parseRows: blank lines kept when skipEmptyLines is false', () => {
  assert.deepEqual(parseRows('a\n\nb\n', { skipEmptyLines: false }), [['a'], [''], ['b']]);
});

test('parseRows: empty input gives no rows', () => {
  assert.deepEqual(parseRows(''), []);
});

test('parseRows: unterminated quote throws', () => {
  assert.throws(() => parseRows('a,b\n"oops,1'), /Unterminated quoted field/);
});

test('parseRows: non-string input and bad delimiter throw TypeError', () => {
  assert.throws(() => parseRows(42), TypeError);
  assert.throws(() => parseRows('a,b', { delimiter: ';;' }), TypeError);
});

test('parseRows: trailing delimiter keeps empty final field', () => {
  assert.deepEqual(parseRows('a,b,\n1,2,\n'), [['a', 'b', ''], ['1', '2', '']]);
});

test('coerceValue: numbers, booleans and quoted text', () => {
  assert.equal(coerceValue('42', false), 42);
  assert.equal(coerceValue('-3.5', false), -3.5);
  assert.equal(coerceValue('1e3', false), 1000);
  assert.equal(coerceValue('true', false), true);
  assert.equal(coerceValue('false', false), false);
  assert.equal(coerceValue('', false), '');
  assert.equal(coerceValue('007', false), '007');
  assert.equal(coerceValue('42', true), '42');
  assert.equal(coerceValue('hello', false), 'hello');
});

test('parseCsv: objects with coerced values', () => {
  const rows = parseCsv('name,age,admin\nAda,36,true\nGrace,28,false\n');
  assert.deepEqual(rows, [
    { name: 'Ada', age: 36, admin: true },
    { name: 'Grace', age: 28, admin: false },
  ]);
});

test('parseCsv: quoted numbers stay strings, unquoted coerce', () => {
  const rows = parseCsv('code,qty\n"007",5\n');
  assert.deepEqual(rows, [{ code: '007', qty: 5 }]);
});

test('parseCsv: --no-coerce equivalent keeps strings', () => {
  const rows = parseCsv('a,b\n1,true\n', { coerce: false });
  assert.deepEqual(rows, [{ a: '1', b: 'true' }]);
});

test('parseCsv: headers are trimmed, duplicate and empty headers rejected', () => {
  assert.deepEqual(parseCsv(' a , b \n1,2\n'), [{ a: 1, b: 2 }]);
  assert.throws(() => parseCsv('a,a\n1,2\n'), /duplicate column names/);
  assert.throws(() => parseCsv('a,\n1,2\n'), /empty column name/);
});

test('parseCsv: ragged rows rejected with the row number', () => {
  assert.throws(() => parseCsv('a,b,c\n1,2\n'), /Row 2 has 2 field\(s\) but the header has 3/);
});

test('parseCsv: header-only input gives an empty array', () => {
  assert.deepEqual(parseCsv('a,b\n'), []);
});

test('parseCsv: semicolon delimiter works end to end', () => {
  assert.deepEqual(parseCsv('a;b\n1;2\n', { delimiter: ';' }), [{ a: 1, b: 2 }]);
});
