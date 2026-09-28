import { parseCsv } from './csv';
import { slug } from './slug';
import { VARIANTS, type Catalog, type Category, type PriceRow, type Service, type Variant } from './types';

const REQUIRED_COLUMNS = ['categoria', 'servicio', 'unidad', 'variante', 'precio'] as const;
type Column = (typeof REQUIRED_COLUMNS)[number];

export interface CatalogResult {
  catalog: Catalog;
  /** Filas descartadas o dudosas, para loguear. No bloquean la carga. */
  warnings: string[];
}

export class CatalogError extends Error {}

/** CSV crudo → catálogo agrupado. Lanza `CatalogError` si el header no sirve. */
export function parseCatalog(csvText: string): CatalogResult {
  const [header, ...body] = parseCsv(csvText);
  if (!header) throw new CatalogError('El CSV está vacío.');

  const index = columnIndex(header);
  const warnings: string[] = [];
  const rows: PriceRow[] = [];

  body.forEach((cells, i) => {
    const line = i + 2; // +1 por el header, +1 porque las líneas arrancan en 1
    const cell = (col: Column) => (cells[index[col]] ?? '').trim();
    const result = toPriceRow(cell('categoria'), cell('servicio'), cell('unidad'), cell('variante'), cell('precio'));
    if (typeof result === 'string') warnings.push(`Línea ${line}: ${result}`);
    else rows.push(result);
  });

  return { catalog: buildCatalog(rows, warnings), warnings };
}

function columnIndex(header: string[]): Record<Column, number> {
  const normalized = header.map((h) => h.trim().toLowerCase());
  const missing = REQUIRED_COLUMNS.filter((c) => !normalized.includes(c));
  if (missing.length > 0) {
    throw new CatalogError(`Faltan columnas en el CSV: ${missing.join(', ')}.`);
  }
  const entries = REQUIRED_COLUMNS.map((c) => [c, normalized.indexOf(c)] as const);
  return Object.fromEntries(entries) as Record<Column, number>;
}

/** Devuelve la fila tipada o un mensaje de error. */
function toPriceRow(
  category: string,
  service: string,
  unit: string,
  rawVariant: string,
  rawPrice: string,
): PriceRow | string {
  if (!category || !service) return 'falta categoría o servicio.';
  const variant = parseVariant(rawVariant);
  if (variant === undefined) return `variante desconocida "${rawVariant}".`;
  const price = parsePrice(rawPrice);
  if (price === null) return `precio inválido "${rawPrice}".`;
  return { category, service, unit, variant, price };
}

function parseVariant(raw: string): Variant | null | undefined {
  const v = raw.toLowerCase();
  if (v === '') return null;
  return VARIANTS.find((known) => known === v);
}

/** Entero en pesos. Tolera "$" y puntos de miles por si el CSV pasó por una planilla. */
export function parsePrice(raw: string): number | null {
  const cleaned = raw.replace(/[$\s.]/g, '');
  if (!/^\d+$/.test(cleaned)) return null;
  const n = Number(cleaned);
  return Number.isSafeInteger(n) ? n : null;
}

/**
 * Agrupa por (categoría, servicio, unidad), respetando el orden de aparición.
 * Variantes del mismo servicio → un solo `Service` con varias opciones.
 */
export function buildCatalog(rows: readonly PriceRow[], warnings: string[] = []): Catalog {
  const categories: Category[] = [];
  const byId = new Map<string, Service>();

  for (const row of rows) {
    const id = serviceId(row.category, row.service, row.unit);
    let service = byId.get(id);
    if (!service) {
      service = { id, category: row.category, name: row.service, unit: row.unit, options: [] };
      byId.set(id, service);
      categoryFor(categories, row.category).services.push(service);
    }
    const existing = service.options.find((o) => o.variant === row.variant);
    if (existing) {
      warnings.push(`"${row.service}" (${row.variant ?? 'sin variante'}) repetido; se usa el último precio.`);
      existing.price = row.price;
    } else {
      service.options.push({ variant: row.variant, price: row.price });
    }
  }

  for (const service of byId.values()) {
    if (service.options.length > 1 && service.options.some((o) => o.variant === null)) {
      // Un servicio con toggle no puede tener además un precio "sin variante".
      warnings.push(`"${service.name}" mezcla filas con y sin variante; se ignora la fila sin variante.`);
      service.options = service.options.filter((o) => o.variant !== null);
    }
    service.options.sort((a, b) => variantOrder(a.variant) - variantOrder(b.variant));
  }
  return { categories, byId };
}

function categoryFor(categories: Category[], name: string): Category {
  let category = categories.find((c) => c.name === name);
  if (!category) {
    category = { name, services: [] };
    categories.push(category);
  }
  return category;
}

function variantOrder(variant: Variant | null): number {
  return variant === null ? -1 : VARIANTS.indexOf(variant);
}

/** Id estable y legible: "tableros-y-protecciones__armado-de-tablero-base__tablero". */
export function serviceId(category: string, service: string, unit: string): string {
  return [category, service, unit].map(slug).join('__');
}
