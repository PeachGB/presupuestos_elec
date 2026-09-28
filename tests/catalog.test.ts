import { describe, expect, it } from 'vitest';
import csvText from '../public/lista-precios.csv?raw';
import { CatalogError, parseCatalog, parsePrice } from '../src/domain/catalog';

const HEADER = 'categoria,servicio,unidad,variante,precio';

describe('parseCatalog con la lista real', () => {
  const { catalog, warnings } = parseCatalog(csvText);

  it('no tiene filas inválidas', () => {
    expect(warnings).toEqual([]);
  });

  it('agrupa las categorías en el orden del CSV', () => {
    expect(catalog.categories.map((c) => c.name)).toEqual([
      'Diagnostico y hora',
      'Tomas puntos e iluminacion',
      'Reparaciones',
      'Tableros y protecciones',
      'Puesta a tierra y acometida',
    ]);
  });

  it('junta embutido/exterior en una sola tarjeta (26 filas → 22 servicios)', () => {
    const services = catalog.categories.flatMap((c) => c.services);
    expect(services).toHaveLength(22);
    const withToggle = services.filter((s) => s.options.length > 1).map((s) => s.name);
    expect(withToggle).toEqual([
      'Boca completa',
      'Agregar toma / interruptor boca nueva',
      'Recableado por boca sin artefacto',
      'Armado de tablero base',
    ]);
  });

  it('ordena las variantes embutido → exterior aunque el CSV las tenga al revés', () => {
    const tablero = catalog.categories
      .flatMap((c) => c.services)
      .find((s) => s.name === 'Armado de tablero base');
    expect(tablero?.options).toEqual([
      { variant: 'embutido', price: 115000 },
      { variant: 'exterior', price: 85000 },
    ]);
  });

  it('los servicios sin variante son tarjetas simples', () => {
    const hora = catalog.categories[0]?.services[1];
    expect(hora).toMatchObject({ name: 'Hora de trabajo', unit: 'hora', options: [{ variant: null, price: 18000 }] });
  });

  it('indexa por id', () => {
    for (const service of catalog.categories.flatMap((c) => c.services)) {
      expect(catalog.byId.get(service.id)).toBe(service);
    }
  });
});

describe('parseCatalog con datos sucios', () => {
  it('descarta filas inválidas con aviso y sigue', () => {
    const { catalog, warnings } = parseCatalog(
      [HEADER, 'A,Uno,ud,,100', 'A,Dos,ud,aereo,100', 'A,Tres,ud,,abc', ',Cuatro,ud,,1'].join('\n'),
    );
    expect(catalog.byId.size).toBe(1);
    expect(warnings).toHaveLength(3);
    expect(warnings[0]).toMatch(/Línea 3: variante desconocida/);
  });

  it('el mismo servicio con distinta unidad son tarjetas distintas', () => {
    const { catalog } = parseCatalog([HEADER, 'A,X,ud,,1', 'A,X,hora,,2'].join('\n'));
    expect(catalog.byId.size).toBe(2);
  });

  it('una variante repetida se queda con el último precio y avisa', () => {
    const { catalog, warnings } = parseCatalog([HEADER, 'A,X,ud,embutido,1', 'A,X,ud,embutido,2'].join('\n'));
    expect([...catalog.byId.values()][0]?.options).toEqual([{ variant: 'embutido', price: 2 }]);
    expect(warnings).toHaveLength(1);
  });

  it('acepta columnas en otro orden y header con mayúsculas', () => {
    const { catalog } = parseCatalog('Precio,Variante,Unidad,Servicio,Categoria\n500,exterior,boca,Boca,A');
    expect([...catalog.byId.values()][0]).toMatchObject({ name: 'Boca', unit: 'boca', options: [{ variant: 'exterior', price: 500 }] });
  });

  it('falla claro si faltan columnas', () => {
    expect(() => parseCatalog('categoria,servicio,precio\nA,B,1')).toThrow(CatalogError);
    expect(() => parseCatalog('')).toThrow(CatalogError);
  });
});

describe('parsePrice', () => {
  it.each([
    ['48000', 48000],
    ['48.000', 48000],
    ['$ 48.000', 48000],
    ['0', 0],
  ])('%s → %d', (raw, expected) => {
    expect(parsePrice(raw)).toBe(expected);
  });

  it.each(['', 'abc', '48000,50', '-10'])('rechaza "%s"', (raw) => {
    expect(parsePrice(raw)).toBeNull();
  });
});

describe('buildCatalog: variantes mezcladas', () => {
  it('si un servicio tiene filas con y sin variante, se queda con las variantes y avisa', () => {
    const { catalog, warnings } = parseCatalog([HEADER, 'A,X,ud,,1', 'A,X,ud,exterior,2', 'A,X,ud,embutido,3'].join('\n'));
    expect([...catalog.byId.values()][0]?.options).toEqual([
      { variant: 'embutido', price: 3 },
      { variant: 'exterior', price: 2 },
    ]);
    expect(warnings).toHaveLength(1);
  });
});
