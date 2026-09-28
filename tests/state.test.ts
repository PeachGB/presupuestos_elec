import { describe, expect, it } from 'vitest';
import { priceKey } from '../src/domain/quote';
import {
  EMPTY_DRAFT,
  isPriceOverridden,
  lineItems,
  newQuote,
  resetPrices,
  setPrice,
  setQuantity,
  setVariant,
  stepQuantity,
  variantOf,
  type AppState,
} from '../src/state/state';
import { catalog, ids } from './fixtures';

const initial: AppState = { catalog, draft: EMPTY_DRAFT, overrides: {} };
const boca = catalog.byId.get(ids.boca)!;

describe('cantidades', () => {
  it('el stepper no baja de 0 y borra la entrada al llegar a 0', () => {
    let s = stepQuantity(initial, ids.hora, 1);
    expect(s.draft.quantities).toEqual({ [ids.hora]: 1 });
    s = stepQuantity(stepQuantity(s, ids.hora, -1), ids.hora, -1);
    expect(s.draft.quantities).toEqual({});
  });

  it('recorta valores tipeados raros', () => {
    expect(setQuantity(initial, ids.hora, 2.7).draft.quantities[ids.hora]).toBe(2);
    expect(setQuantity(initial, ids.hora, 5000).draft.quantities[ids.hora]).toBe(999);
    expect(setQuantity(initial, ids.hora, Number.NaN)).toBe(initial);
  });

  it('sin cambios devuelve el mismo estado (no dispara renders ni escrituras)', () => {
    expect(setQuantity(initial, ids.hora, 0)).toBe(initial);
  });
});

describe('variantes', () => {
  it('por defecto es embutido y se puede cambiar', () => {
    expect(variantOf(initial, boca)).toBe('embutido');
    const s = setVariant(stepQuantity(initial, ids.boca, 1), ids.boca, 'exterior');
    expect(lineItems(s)).toEqual([{ serviceId: ids.boca, variant: 'exterior', quantity: 1 }]);
  });
});

describe('precios editados', () => {
  it('guarda el override de la variante elegida', () => {
    const s = setPrice(initial, boca, 'exterior', 30000);
    expect(s.overrides).toEqual({ [priceKey(ids.boca, 'exterior')]: 30000 });
    expect(isPriceOverridden(s, boca)).toBe(false); // la elegida sigue siendo embutido
    expect(isPriceOverridden(setVariant(s, ids.boca, 'exterior'), boca)).toBe(true);
  });

  it('volver al precio del CSV o vaciar borra el override', () => {
    const s = setPrice(initial, boca, 'embutido', 50000);
    expect(setPrice(s, boca, 'embutido', 48000).overrides).toEqual({});
    expect(setPrice(s, boca, 'embutido', null).overrides).toEqual({});
  });

  it('restaurar precios borra todos los overrides', () => {
    const s = setPrice(setPrice(initial, boca, 'embutido', 1), boca, 'exterior', 2);
    expect(resetPrices(s).overrides).toEqual({});
  });
});

describe('nuevo presupuesto', () => {
  it('limpia cantidades, variantes y cliente pero conserva precios', () => {
    let s = setPrice(initial, boca, 'embutido', 50000);
    s = setVariant(stepQuantity(s, ids.boca, 3), ids.boca, 'exterior');
    s = { ...s, draft: { ...s.draft, clientName: 'Juan' } };
    const fresh = newQuote(s);
    expect(fresh.draft).toEqual(EMPTY_DRAFT);
    expect(fresh.overrides).toEqual(s.overrides);
  });
});
