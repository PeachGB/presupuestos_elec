import { formatDate, formatMoney } from './format';
import type { Quote, QuoteLine } from './types';

const RULE = '----------------------------------';

export interface TextOptions {
  businessName: string;
  footer: string;
}

/**
 * Texto del presupuesto con formato de WhatsApp (*negrita*, _cursiva_).
 * WhatsApp usa fuente proporcional, así que el subtotal va separado con "—"
 * en vez de alinearlo con espacios.
 */
export function quoteToWhatsAppText(quote: Quote, { businessName, footer }: TextOptions): string {
  const lines = [`*PRESUPUESTO — ${businessName}*`, formatDate(quote.date)];
  if (quote.clientName) lines.push(`Cliente: ${quote.clientName}`);
  lines.push(RULE, ...quote.lines.map(formatLine), RULE);
  lines.push(`*TOTAL: ${formatMoney(quote.total)}*`, '', `_${footer}_`);
  return lines.join('\n');
}

export function lineLabel(line: Pick<QuoteLine, 'name' | 'variant'>): string {
  return line.variant ? `${line.name} ${line.variant}` : line.name;
}

function formatLine(line: QuoteLine): string {
  return `${line.quantity} × ${lineLabel(line)} — ${formatMoney(line.subtotal)}`;
}
