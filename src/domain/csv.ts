/**
 * Parser CSV mínimo (RFC 4180): comillas dobles, comillas escapadas (""),
 * saltos de línea dentro de comillas, CRLF y BOM.
 * Detecta `;` como separador si el header lo usa (Excel en español exporta así).
 */
export function parseCsv(text: string): string[][] {
  const source = text.startsWith('﻿') ? text.slice(1) : text;
  const delimiter = detectDelimiter(source);
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let inQuotes = false;

  for (let i = 0; i < source.length; i++) {
    const ch = source[i];
    if (inQuotes) {
      if (ch === '"') {
        if (source[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += ch;
      }
      continue;
    }
    if (ch === '"') {
      inQuotes = true;
    } else if (ch === delimiter) {
      row.push(field);
      field = '';
    } else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && source[i + 1] === '\n') i++;
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
    } else {
      field += ch;
    }
  }
  if (field !== '' || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  // Descarta líneas vacías (por ejemplo, el salto de línea final).
  return rows.filter((r) => r.some((cell) => cell.trim() !== ''));
}

function detectDelimiter(text: string): ',' | ';' {
  const firstLine = text.slice(0, text.search(/\r?\n|$/));
  return firstLine.includes(';') && !firstLine.includes(',') ? ';' : ',';
}
