# csv-to-json-cli

Convert CSV to JSON from the command line or as a small library. No dependencies — Node.js standard library only.

## What it does

- Reads CSV from a file or stdin and writes a JSON array to stdout.
- Handles quoted fields (embedded commas, newlines and doubled quotes), custom delimiters, CRLF/LF line endings and blank lines.
- Coerces unquoted numbers and `true`/`false` to real JSON values; quoted values always stay strings (quoting in CSV means "treat me as text").
- Rejects malformed input with a clear error: unterminated quotes, duplicate or empty headers, ragged rows.

## Install / run

Requires Node.js 18+.

```sh
node src/cli.js data.csv
printf 'name,age\nAda,36\n' | node src/cli.js
```

## Usage

```
Usage: csv-to-json [options] [file]

Options:
  -d, --delimiter <char>   Field delimiter (default: ,)
  --no-coerce              Keep every value a string (no number/boolean conversion)
  --ndjson                 One JSON object per line instead of a JSON array
  --pretty                 Pretty-print the JSON array (default when output is a TTY)
  -h, --help               Show this help
```

Examples:

```sh
# Compact JSON array (default when piped)
csv-to-json people.csv

# One object per line, for piping into jq or a log pipeline
csv-to-json --ndjson people.csv

# Semicolon-separated file, values kept as strings
csv-to-json -d ';' --no-coerce export.csv
```

## Library use

```js
const { parseCsv, parseRows } = require('./src/csv');

parseCsv('name,age\nAda,36\n');
// => [{ name: 'Ada', age: 36 }]

parseRows('a,b\n"1,5",2\n');
// => [['a', 'b'], ['1,5', '2']]
```

Options for `parseCsv(text, options)`: `delimiter` (default `','`), `coerce` (default `true`), `skipEmptyLines` (default `true`), `trimHeaders` (default `true`).

## Test

```sh
npm test
```

Runs the Node.js built-in test runner (`node --test`) over `test/`.

## License

MIT
