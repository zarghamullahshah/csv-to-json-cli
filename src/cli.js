#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const { parseCsv } = require('./csv');

const USAGE = `Usage: csv-to-json [options] [file]

Convert CSV to JSON. Reads from <file> or stdin when no file is given,
writes a JSON array to stdout.

Options:
  -d, --delimiter <char>   Field delimiter (default: ,)
  --no-coerce              Keep every value a string (no number/boolean conversion)
  --ndjson                 One JSON object per line instead of a JSON array
  --pretty                 Pretty-print the JSON array (default when output is a TTY)
  -h, --help               Show this help
`;

function parseArgs(argv) {
  const opts = { delimiter: ',', coerce: true, ndjson: false, pretty: null, file: null };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '-h' || arg === '--help') return { help: true };
    if (arg === '-d' || arg === '--delimiter') {
      const value = argv[i + 1];
      if (value === undefined || value.length !== 1) {
        throw new Error('--delimiter needs exactly one character');
      }
      opts.delimiter = value;
      i += 1;
    } else if (arg === '--no-coerce') {
      opts.coerce = false;
    } else if (arg === '--ndjson') {
      opts.ndjson = true;
    } else if (arg === '--pretty') {
      opts.pretty = true;
    } else if (arg.startsWith('-')) {
      throw new Error(`Unknown option: ${arg}`);
    } else if (opts.file === null) {
      opts.file = arg;
    } else {
      throw new Error(`Unexpected extra argument: ${arg}`);
    }
  }
  return opts;
}

function readInput(file) {
  if (file === null) return fs.readFileSync(0, 'utf8');
  return fs.readFileSync(file, 'utf8');
}

function main(argv) {
  let opts;
  try {
    opts = parseArgs(argv);
  } catch (err) {
    process.stderr.write(`csv-to-json: ${err.message}\n${USAGE}`);
    process.exitCode = 2;
    return;
  }
  if (opts.help) {
    process.stdout.write(USAGE);
    return;
  }

  let text;
  try {
    text = readInput(opts.file);
  } catch (err) {
    process.stderr.write(`csv-to-json: cannot read ${opts.file ?? 'stdin'}: ${err.message}\n`);
    process.exitCode = 1;
    return;
  }

  let rows;
  try {
    rows = parseCsv(text, { delimiter: opts.delimiter, coerce: opts.coerce });
  } catch (err) {
    process.stderr.write(`csv-to-json: ${err.message}\n`);
    process.exitCode = 1;
    return;
  }

  if (opts.ndjson) {
    for (const row of rows) process.stdout.write(`${JSON.stringify(row)}\n`);
    return;
  }
  const pretty = opts.pretty ?? process.stdout.isTTY;
  process.stdout.write(pretty ? `${JSON.stringify(rows, null, 2)}\n` : `${JSON.stringify(rows)}\n`);
}

if (require.main === module) main(process.argv.slice(2));

module.exports = { parseArgs, main };
