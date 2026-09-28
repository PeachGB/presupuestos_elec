import { describe, expect, it } from 'vitest';
import { parseCsv } from '../src/domain/csv';

describe('parseCsv', () => {
  it('parsea filas simples e ignora el salto de línea final', () => {
    expect(parseCsv('a,b,c\n1,2,3\n')).toEqual([
      ['a', 'b', 'c'],
      ['1', '2', '3'],
    ]);
  });

  it('respeta comillas, comas y comillas escapadas dentro de un campo', () => {
    expect(parseCsv('a,b\n"Toma, doble","dice ""hola"""')).toEqual([
      ['a', 'b'],
      ['Toma, doble', 'dice "hola"'],
    ]);
  });

  it('tolera CRLF, BOM y líneas en blanco', () => {
    expect(parseCsv('﻿a,b\r\n\r\n1,2\r\n')).toEqual([
      ['a', 'b'],
      ['1', '2'],
    ]);
  });

  it('mantiene campos vacíos', () => {
    expect(parseCsv('a,b,c\nx,,z')).toEqual([
      ['a', 'b', 'c'],
      ['x', '', 'z'],
    ]);
  });

  it('detecta ";" como separador si el header lo usa', () => {
    expect(parseCsv('a;b\n1;2')).toEqual([
      ['a', 'b'],
      ['1', '2'],
    ]);
  });
});
