#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const { parseCsv } = require('./csv');

const USAGE = `Usage: csv-to-json [options] [file]

Convert CSV to JSON. Reads from <file> or stdin when no file is given,
writes a JSON array to stdout.

Options:
  -d, --delimiter <char|name>   Field delimiter: a single character, or one
                                of comma, semicolon, tab, pipe (default: ,)
  --no-coerce              Keep every value a string (no number/boolean conversion)
  --ndjson                 One JSON object per line instead of a JSON array
  --pretty                 Pretty-print the JSON array (default when output is a TTY)
  --indent <n>             Indent width for --pretty (integer 0-10, default: 2)
  -h, --help               Show this help
`;

// Named delimiters, for characters that are awkward to type on the
// command line (a literal tab in particular). Single characters keep
// working as before, and the two-character escape "\t" also means tab.
const NAMED_DELIMITERS = { comma: ',', semicolon: ';', tab: '\t', pipe: '|' };

function resolveDelimiter(value) {
  if (value === undefined) {
    throw new Error('--delimiter needs a value (a character, or comma, semicolon, tab or pipe)');
  }
  if (value === '\\t' || NAMED_DELIMITERS[value] !== undefined) {
    return value === '\\t' ? '\t' : NAMED_DELIMITERS[value];
  }
  if (value.length !== 1) {
    throw new Error('--delimiter needs exactly one character, or a name: comma, semicolon, tab or pipe');
  }
  return value;
}

function parseArgs(argv) {
  const opts = { delimiter: ',', coerce: true, ndjson: false, pretty: null, indent: 2, file: null };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '-h' || arg === '--help') return { help: true };
    if (arg === '-d' || arg === '--delimiter') {
      opts.delimiter = resolveDelimiter(argv[i + 1]);
      i += 1;
    } else if (arg === '--no-coerce') {
      opts.coerce = false;
    } else if (arg === '--ndjson') {
      opts.ndjson = true;
    } else if (arg === '--pretty') {
      opts.pretty = true;
    } else if (arg === '--indent') {
      const value = argv[i + 1];
      if (value === undefined || !/^\d+$/.test(value) || Number(value) > 10) {
        throw new Error('--indent needs an integer between 0 and 10');
      }
      opts.indent = Number(value);
      i += 1;
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
  process.stdout.write(pretty ? `${JSON.stringify(rows, null, opts.indent)}\n` : `${JSON.stringify(rows)}\n`);
}

if (require.main === module) main(process.argv.slice(2));

module.exports = { parseArgs, main };
