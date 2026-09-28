import { describe, expect, it } from 'vitest';
import { buildQuotePdf } from '../src/pdf/quotePdf';
import { pdfFileName } from '../src/pdf/deliver';
import type { Quote, QuoteLine } from '../src/domain/types';

const business = { name: 'Electricidad Domiciliaria', whatsapp: '+54 9 221 000-0000', area: 'La Plata' };
const footer = 'Mano de obra. Materiales aparte. Válido 7 días.';

function quote(lineCount: number, clientName = 'Juan Pérez'): Quote {
  const lines: QuoteLine[] = Array.from({ length: lineCount }, (_, i) => ({
    serviceId: `s${i}`,
    name: i % 3 === 0 ? 'Agregar toma / interruptor boca nueva con un nombre largo que obliga a cortar en dos líneas' : 'Boca completa',
    unit: 'boca',
    variant: i % 2 === 0 ? 'embutido' : null,
    quantity: 2,
    unitPrice: 48000,
    subtotal: 96000,
  }));
  return { clientName, date: new Date(2026, 8, 28), lines, total: lineCount * 96000 };
}

/** jsPDF sin compresión deja el texto legible en el PDF crudo. */
function rawPdf(q: Quote): string {
  return buildQuotePdf(q, business, footer).output();
}

describe('buildQuotePdf', () => {
  it('genera un PDF con encabezado, cliente, total y pie de mano de obra', () => {
    const raw = rawPdf(quote(3));
    expect(raw.startsWith('%PDF-')).toBe(true);
    for (const text of ['ELECTRICIDAD DOMICILIARIA', 'Juan P', '28/09/2026', '$ 288.000', 'Mano de obra. Materiales aparte.']) {
      expect(raw).toContain(text);
    }
  });

  it('pasa a una página nueva cuando hay muchos ítems y repite el pie', () => {
    const doc = buildQuotePdf(quote(40), business, footer);
    expect(doc.getNumberOfPages()).toBeGreaterThan(1);
    const pages = doc.getNumberOfPages();
    expect(doc.output().split('Mano de obra. Materiales aparte.').length - 1).toBe(pages);
  });

  it('imprime la línea de cliente solo si hay nombre', () => {
    // En el PDF crudo, cada texto aparece como "(texto) Tj".
    expect(rawPdf(quote(1))).toContain('(Cliente)');
    expect(rawPdf(quote(1, ''))).not.toContain('(Cliente)');
  });
});

describe('pdfFileName', () => {
  it('usa fecha local y cliente sin tildes', () => {
    expect(pdfFileName({ date: new Date(2026, 8, 28), clientName: 'Juan Pérez' })).toBe('presupuesto-2026-09-28-juan-perez.pdf');
    expect(pdfFileName({ date: new Date(2026, 0, 5), clientName: '' })).toBe('presupuesto-2026-01-05.pdf');
  });
});
