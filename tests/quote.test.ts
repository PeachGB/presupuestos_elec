import { describe, expect, it } from 'vitest';
import { buildQuote, lineTotal, priceKey, quoteTotal, unitPrice } from '../src/domain/quote';
import { catalog, ids } from './fixtures';

const date = new Date(2026, 8, 28);

describe('lineTotal', () => {
  it('es cantidad × precio', () => {
    expect(lineTotal(3, 48000)).toBe(144000);
    expect(lineTotal(0, 48000)).toBe(0);
  });
});

describe('quoteTotal', () => {
  it('suma los subtotales', () => {
    expect(quoteTotal([{ subtotal: 96000 }, { subtotal: 18000 }])).toBe(114000);
  });

  it('vacío da 0', () => {
    expect(quoteTotal([])).toBe(0);
  });
});

describe('unitPrice', () => {
  const boca = catalog.byId.get(ids.boca)!;

  it('usa el precio de la variante elegida', () => {
    expect(unitPrice(boca, 'embutido', {})).toBe(48000);
    expect(unitPrice(boca, 'exterior', {})).toBe(34000);
  });

  it('el override pisa al CSV solo para esa variante', () => {
    const overrides = { [priceKey(ids.boca, 'exterior')]: 30000 };
    expect(unitPrice(boca, 'exterior', overrides)).toBe(30000);
    expect(unitPrice(boca, 'embutido', overrides)).toBe(48000);
  });

  it('sin variante elegida cae en la primera (embutido)', () => {
    expect(unitPrice(boca, null, {})).toBe(48000);
  });
});

describe('buildQuote', () => {
  it('calcula líneas y total con la variante de cada ítem', () => {
    const quote = buildQuote(
      catalog,
      [
        { serviceId: ids.boca, variant: 'exterior', quantity: 2 },
        { serviceId: ids.hora, variant: null, quantity: 3 },
      ],
      {},
      '  Juan Pérez ',
      date,
    );
    expect(quote.lines.map((l) => [l.name, l.variant, l.quantity, l.unitPrice, l.subtotal])).toEqual([
      ['Hora de trabajo', null, 3, 18000, 54000],
      ['Boca completa', 'exterior', 2, 34000, 68000],
    ]);
    expect(quote.total).toBe(122000);
    expect(quote.clientName).toBe('Juan Pérez');
    expect(quote.date).toBe(date);
  });

  it('aplica overrides de precio', () => {
    const quote = buildQuote(
      catalog,
      [{ serviceId: ids.ventilador, variant: null, quantity: 2 }],
      { [priceKey(ids.ventilador, null)]: 45000 },
      '',
      date,
    );
    expect(quote.total).toBe(90000);
  });

  it('ignora cantidades en 0 e ids que no están en el catálogo', () => {
    const quote = buildQuote(
      catalog,
      [
        { serviceId: ids.hora, variant: null, quantity: 0 },
        { serviceId: 'ya-no-existe', variant: null, quantity: 5 },
      ],
      {},
      '',
      date,
    );
    expect(quote.lines).toEqual([]);
    expect(quote.total).toBe(0);
  });
});
