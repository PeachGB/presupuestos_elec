import { describe, expect, it } from 'vitest';
import { buildQuote } from '../src/domain/quote';
import { quoteToWhatsAppText } from '../src/domain/whatsapp';
import { catalog, ids } from './fixtures';

const options = {
  businessName: 'Electricidad Domiciliaria',
  footer: 'Mano de obra. Materiales aparte. Válido 7 días.',
};
const date = new Date(2026, 8, 28);
// Intl separa "$" del número con un espacio duro (U+00A0).
const nbsp = ' ';

function quote(clientName: string) {
  return buildQuote(
    catalog,
    [
      { serviceId: ids.boca, variant: 'embutido', quantity: 2 },
      { serviceId: ids.hora, variant: null, quantity: 1 },
    ],
    {},
    clientName,
    date,
  );
}

describe('quoteToWhatsAppText', () => {
  it('arma el texto completo con formato de WhatsApp', () => {
    expect(quoteToWhatsAppText(quote(''), options)).toBe(
      [
        '*PRESUPUESTO — Electricidad Domiciliaria*',
        '28/09/2026',
        '----------------------------------',
        `1 × Hora de trabajo — $${nbsp}18.000`,
        `2 × Boca completa embutido — $${nbsp}96.000`,
        '----------------------------------',
        `*TOTAL: $${nbsp}114.000*`,
        '',
        '_Mano de obra. Materiales aparte. Válido 7 días._',
      ].join('\n'),
    );
  });

  it('agrega el cliente debajo de la fecha si hay nombre', () => {
    const lines = quoteToWhatsAppText(quote('María'), options).split('\n');
    expect(lines.slice(1, 4)).toEqual(['28/09/2026', 'Cliente: María', '----------------------------------']);
  });

  it('siempre aclara que es mano de obra', () => {
    expect(quoteToWhatsAppText(quote(''), options)).toContain('Mano de obra. Materiales aparte.');
  });
});
