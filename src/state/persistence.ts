import { VARIANTS, type PriceOverrides, type Variant } from '../domain/types';
import { EMPTY_DRAFT, MAX_QUANTITY, type Draft } from './state';

const KEYS = {
  draft: 'presupuestos-elec:v1:draft',
  overrides: 'presupuestos-elec:v1:overrides',
} as const;

/** `localStorage` puede no existir o tirar (modo privado, cookies bloqueadas). */
export function getStorage(): Storage | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

export function loadDraft(storage: Storage | null): Draft {
  const raw = readJson(storage, KEYS.draft);
  if (!isRecord(raw)) return EMPTY_DRAFT;
  return {
    quantities: filterValues(raw.quantities, isQuantity),
    variants: filterValues(raw.variants, isVariant),
    clientName: typeof raw.clientName === 'string' ? raw.clientName : '',
  };
}

export function saveDraft(storage: Storage | null, draft: Draft): void {
  writeJson(storage, KEYS.draft, draft);
}

export function loadOverrides(storage: Storage | null): PriceOverrides {
  return filterValues(readJson(storage, KEYS.overrides), isPrice);
}

export function saveOverrides(storage: Storage | null, overrides: PriceOverrides): void {
  writeJson(storage, KEYS.overrides, overrides);
}

function readJson(storage: Storage | null, key: string): unknown {
  try {
    const raw = storage?.getItem(key);
    return raw ? (JSON.parse(raw) as unknown) : null;
  } catch {
    return null;
  }
}

function writeJson(storage: Storage | null, key: string, value: unknown): void {
  try {
    storage?.setItem(key, JSON.stringify(value));
  } catch {
    // Sin espacio o sin permiso: la app sigue funcionando, solo no recuerda.
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** Se queda solo con las entradas válidas; lo demás se descarta en silencio. */
function filterValues<T>(value: unknown, isValid: (v: unknown) => v is T): Record<string, T> {
  if (!isRecord(value)) return {};
  const result: Record<string, T> = {};
  for (const [key, v] of Object.entries(value)) {
    if (isValid(v)) result[key] = v;
  }
  return result;
}

function isQuantity(v: unknown): v is number {
  return Number.isInteger(v) && (v as number) > 0 && (v as number) <= MAX_QUANTITY;
}

function isPrice(v: unknown): v is number {
  return Number.isSafeInteger(v) && (v as number) >= 0;
}

function isVariant(v: unknown): v is Variant {
  return VARIANTS.includes(v as Variant);
}
