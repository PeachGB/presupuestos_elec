import { buildCatalog } from '../src/domain/catalog';
import type { PriceRow } from '../src/domain/types';

export const rows: PriceRow[] = [
  { category: 'Diagnóstico', service: 'Hora de trabajo', unit: 'hora', variant: null, price: 18000 },
  { category: 'Tomas', service: 'Boca completa', unit: 'boca', variant: 'embutido', price: 48000 },
  { category: 'Tomas', service: 'Boca completa', unit: 'boca', variant: 'exterior', price: 34000 },
  { category: 'Tomas', service: 'Ventilador de techo', unit: 'ud', variant: null, price: 42000 },
];

export const catalog = buildCatalog(rows);

export const ids = {
  hora: 'diagnostico__hora-de-trabajo__hora',
  boca: 'tomas__boca-completa__boca',
  ventilador: 'tomas__ventilador-de-techo__ud',
} as const;
