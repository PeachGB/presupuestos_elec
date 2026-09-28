/** Tipo de instalación. `embutido` = en la pared, `exterior` = a la vista. */
export type Variant = 'embutido' | 'exterior';

/** Orden canónico de las variantes en el toggle. La primera es la de por defecto. */
export const VARIANTS: readonly Variant[] = ['embutido', 'exterior'];

/** Una fila válida del CSV, ya tipada. */
export interface PriceRow {
  category: string;
  service: string;
  unit: string;
  variant: Variant | null;
  price: number;
}

/** Precio de un servicio para una variante (o sin variante). */
export interface ServiceOption {
  variant: Variant | null;
  price: number;
}

/**
 * Servicio agrupado por (categoría, servicio, unidad).
 * `options` tiene una sola entrada (tarjeta simple) o varias (tarjeta con toggle).
 */
export interface Service {
  id: string;
  category: string;
  name: string;
  unit: string;
  options: ServiceOption[];
}

export interface Category {
  name: string;
  services: Service[];
}

export interface Catalog {
  categories: Category[];
  /** Índice por id para búsquedas O(1). */
  byId: ReadonlyMap<string, Service>;
}

/** Lo que el usuario cargó para un servicio en el presupuesto en curso. */
export interface LineItem {
  serviceId: string;
  variant: Variant | null;
  quantity: number;
}

/** Overrides de precio editados por el usuario, por clave de `priceKey`. */
export type PriceOverrides = Readonly<Record<string, number>>;

/** Línea resuelta (precio final aplicado), lista para texto o PDF. */
export interface QuoteLine {
  serviceId: string;
  name: string;
  unit: string;
  variant: Variant | null;
  quantity: number;
  unitPrice: number;
  subtotal: number;
}

export interface Quote {
  clientName: string;
  date: Date;
  lines: QuoteLine[];
  total: number;
}
