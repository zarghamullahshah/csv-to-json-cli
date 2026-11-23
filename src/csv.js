'use strict';

/**
 * Minimal CSV parser with no dependencies.
 *
 * Handles quoted fields (including embedded delimiters, newlines and
 * doubled quotes), custom delimiters, CRLF/LF line endings and blank
 * lines. Throws a descriptive Error on malformed input such as an
 * unterminated quoted field or a ragged row.
 */

/**
 * Parse CSV text into rows of `{ value, quoted }` cells. `quoted` is true
 * when the field was wrapped in double quotes in the source text.
 *
 * @param {string} text - Raw CSV text.
 * @param {object} [options]
 * @param {string} [options.delimiter=','] - Single-character field delimiter.
 * @param {boolean} [options.skipEmptyLines=true] - Ignore blank lines.
 * @returns {{value: string, quoted: boolean}[][]}
 */
function parseCells(text, options = {}) {
  const delimiter = options.delimiter ?? ',';
  const skipEmptyLines = options.skipEmptyLines ?? true;

  if (typeof text !== 'string') {
    throw new TypeError('CSV input must be a string');
  }
  if (typeof delimiter !== 'string' || delimiter.length !== 1) {
    throw new TypeError('delimiter must be a single character');
  }

  const rows = [];
  let row = [];
  let field = '';
  let fieldQuoted = false;
  let inQuotes = false;
  let i = 0;

  const endField = () => {
    row.push({ value: field, quoted: fieldQuoted });
    field = '';
    fieldQuoted = false;
  };
  const endRow = () => {
    endField();
    if (!(skipEmptyLines && row.length === 1 && row[0].value === '' && !row[0].quoted)) {
      rows.push(row);
    }
    row = [];
  };

  while (i < text.length) {
    const ch = text[i];

    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i += 2;
        } else {
          inQuotes = false;
          i += 1;
        }
      } else {
        field += ch;
        i += 1;
      }
      continue;
    }

    if (ch === '"' && field === '' && !fieldQuoted) {
      inQuotes = true;
      fieldQuoted = true;
      i += 1;
    } else if (ch === delimiter) {
      endField();
      i += 1;
    } else if (ch === '\r') {
      if (text[i + 1] === '\n') i += 1;
      endRow();
      i += 1;
    } else if (ch === '\n') {
      endRow();
      i += 1;
    } else {
      field += ch;
      i += 1;
    }
  }

  if (inQuotes) {
    throw new Error('Unterminated quoted field in CSV input');
  }
  // Flush the final row unless the input ended exactly on a newline
  // (in which case the last row was already closed).
  if (field !== '' || row.length > 0) {
    endRow();
  }

  return rows;
}

/**
 * Parse CSV text into an array of rows (each row is an array of strings).
 *
 * @param {string} text - Raw CSV text.
 * @param {object} [options]
 * @param {string} [options.delimiter=','] - Single-character field delimiter.
 * @param {boolean} [options.skipEmptyLines=true] - Ignore blank lines.
 * @returns {string[][]}
 */
function parseRows(text, options = {}) {
  return parseCells(text, options).map((row) => row.map((cell) => cell.value));
}

/**
 * Coerce a raw CSV string value to a JSON-friendly value.
 * "true"/"false" become booleans, numeric-looking strings become numbers,
 * empty strings stay empty strings. Quoted fields are never coerced:
 * quoting in CSV is how a value says "treat me as text".
 *
 * @param {string} value
 * @param {boolean} wasQuoted
 * @returns {string|number|boolean}
 */
function coerceValue(value, wasQuoted) {
  if (wasQuoted || value === '') return value;
  if (value === 'true') return true;
  if (value === 'false') return false;
  if (/^-?(0|[1-9]\d*)(\.\d+)?([eE][+-]?\d+)?$/.test(value)) {
    const num = Number(value);
    if (Number.isFinite(num)) return num;
  }
  return value;
}

/**
 * Parse CSV text into an array of objects using the first row as headers.
 *
 * @param {string} text - Raw CSV text.
 * @param {object} [options]
 * @param {string} [options.delimiter=','] - Single-character field delimiter.
 * @param {boolean} [options.skipEmptyLines=true] - Ignore blank lines.
 * @param {boolean} [options.coerce=true] - Convert numbers/booleans.
 * @param {boolean} [options.trimHeaders=true] - Trim whitespace around headers.
 * @returns {object[]}
 */
function parseCsv(text, options = {}) {
  const coerce = options.coerce ?? true;
  const trimHeaders = options.trimHeaders ?? true;

  const rows = parseCells(text, {
    delimiter: options.delimiter ?? ',',
    skipEmptyLines: options.skipEmptyLines ?? true,
  });
  if (rows.length === 0) return [];

  const headers = rows[0].map((cell) => (trimHeaders ? cell.value.trim() : cell.value));
  if (headers.some((h) => h === '')) {
    throw new Error('CSV header row contains an empty column name');
  }
  if (new Set(headers).size !== headers.length) {
    throw new Error('CSV header row contains duplicate column names');
  }

  return rows.slice(1).map((row, rowIndex) => {
    if (row.length !== headers.length) {
      throw new Error(
        `Row ${rowIndex + 2} has ${row.length} field(s) but the header has ${headers.length}`
      );
    }
    const obj = {};
    headers.forEach((header, col) => {
      obj[header] = coerce ? coerceValue(row[col].value, row[col].quoted) : row[col].value;
    });
    return obj;
  });
}

module.exports = { parseCells, parseRows, parseCsv, coerceValue };
