import { priceKey, selectOption } from '../domain/quote';
import type { Catalog, LineItem, PriceOverrides, Service, Variant } from '../domain/types';

export const MAX_QUANTITY = 999;

/** Presupuesto en curso (lo que "Nuevo presupuesto" limpia). */
export interface Draft {
  quantities: Readonly<Record<string, number>>;
  variants: Readonly<Record<string, Variant>>;
  clientName: string;
}

export interface AppState {
  catalog: Catalog;
  draft: Draft;
  overrides: PriceOverrides;
}

export const EMPTY_DRAFT: Draft = { quantities: {}, variants: {}, clientName: '' };

// --- Lecturas -------------------------------------------------------------

export function quantityOf(state: AppState, serviceId: string): number {
  return state.draft.quantities[serviceId] ?? 0;
}

/** Variante elegida, o la primera del servicio (null si no tiene variantes). */
export function variantOf(state: AppState, service: Service): Variant | null {
  return selectOption(service, state.draft.variants[service.id] ?? null).variant;
}

export function isPriceOverridden(state: AppState, service: Service): boolean {
  return priceKey(service.id, variantOf(state, service)) in state.overrides;
}

export function lineItems(state: AppState): LineItem[] {
  return Object.entries(state.draft.quantities).flatMap(([serviceId, quantity]) => {
    const service = state.catalog.byId.get(serviceId);
    return service ? [{ serviceId, variant: variantOf(state, service), quantity }] : [];
  });
}

// --- Transiciones puras ---------------------------------------------------

export function clampQuantity(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.min(MAX_QUANTITY, Math.max(0, Math.trunc(value)));
}

export function setQuantity(state: AppState, serviceId: string, value: number): AppState {
  const quantity = clampQuantity(value);
  if (quantity === quantityOf(state, serviceId)) return state;
  const { [serviceId]: _removed, ...rest } = state.draft.quantities;
  const quantities = quantity > 0 ? { ...rest, [serviceId]: quantity } : rest;
  return { ...state, draft: { ...state.draft, quantities } };
}

export function stepQuantity(state: AppState, serviceId: string, delta: number): AppState {
  return setQuantity(state, serviceId, quantityOf(state, serviceId) + delta);
}

export function setVariant(state: AppState, serviceId: string, variant: Variant): AppState {
  if (state.draft.variants[serviceId] === variant) return state;
  const variants = { ...state.draft.variants, [serviceId]: variant };
  return { ...state, draft: { ...state.draft, variants } };
}

export function setClientName(state: AppState, clientName: string): AppState {
  if (state.draft.clientName === clientName) return state;
  return { ...state, draft: { ...state.draft, clientName } };
}

/**
 * Guarda un precio editado. `null` o el mismo precio del CSV borran el override
 * (así "editar y volver al original" no deja basura guardada).
 */
export function setPrice(state: AppState, service: Service, variant: Variant | null, price: number | null): AppState {
  const option = selectOption(service, variant);
  const key = priceKey(service.id, option.variant);
  const { [key]: _removed, ...rest } = state.overrides;
  const overrides = price === null || price === option.price ? rest : { ...rest, [key]: price };
  return { ...state, overrides };
}

export function resetPrices(state: AppState): AppState {
  return Object.keys(state.overrides).length === 0 ? state : { ...state, overrides: {} };
}

/** Limpia cantidades, variantes y cliente. Conserva los precios editados. */
export function newQuote(state: AppState): AppState {
  return { ...state, draft: EMPTY_DRAFT };
}
