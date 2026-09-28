import { jsPDF } from 'jspdf';
import type { Business } from '../config';
import { formatDate, formatMoney } from '../domain/format';
import type { Quote, QuoteLine } from '../domain/types';
import { lineLabel } from '../domain/whatsapp';

type Rgb = [number, number, number];

const INK: Rgb = [20, 20, 20];
const YELLOW: Rgb = [255, 199, 0];
const BONE: Rgb = [237, 231, 218];
const MUTED: Rgb = [105, 101, 94];
const RULE: Rgb = [214, 211, 204];

// A4 en milímetros.
const PAGE = { width: 210, height: 297, margin: 16 } as const;
const RIGHT = PAGE.width - PAGE.margin;
const COL = { qty: PAGE.margin + 3, name: PAGE.margin + 20, subtotal: RIGHT - 3 } as const;
const NAME_WIDTH = COL.subtotal - 36 - COL.name;
/** Espacio reservado al pie de cada página. */
const FOOTER_SPACE = 28;
const NAME_LINE_H = 4.8;

/** Mismo rayo que el ícono de la app, en una grilla de 64×64. */
const BOLT: readonly (readonly [number, number])[] = [
  [38, 4],
  [14, 36],
  [30, 36],
  [24, 60],
  [50, 26],
  [34, 26],
];

/**
 * Las fuentes estándar de jsPDF usan WinAnsi: tildes, ñ, "·" y "—" andan,
 * pero los espacios duros de Intl no siempre. Los normalizamos.
 */
function pdfText(text: string): string {
  return text.replace(/[  ]/g, ' ');
}

export function buildQuotePdf(quote: Quote, business: Business, footer: string): jsPDF {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  doc.setProperties({
    title: `Presupuesto ${formatDate(quote.date)}`,
    author: business.name,
    creator: business.name,
  });

  let y = drawHeader(doc, business);
  y = drawTitle(doc, quote, y);
  y = drawTableHeader(doc, y);
  for (const line of quote.lines) y = drawLine(doc, line, y);
  drawTotal(doc, quote.total, y);
  drawFooters(doc, business, footer);
  return doc;
}

export function renderQuotePdf(quote: Quote, business: Business, footer: string): Blob {
  return buildQuotePdf(quote, business, footer).output('blob');
}

function drawHeader(doc: jsPDF, business: Business): number {
  const bandH = 30;
  doc.setFillColor(...INK);
  doc.rect(0, 0, PAGE.width, bandH, 'F');
  doc.setFillColor(...YELLOW);
  doc.rect(0, bandH, PAGE.width, 1.2, 'F');
  drawBolt(doc, PAGE.margin, 7, 16);

  const textX = PAGE.margin + 14;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(17);
  doc.setTextColor(...YELLOW);
  doc.text(pdfText(business.name.toUpperCase()), textX, 14.5);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(...BONE);
  doc.text(pdfText(`WhatsApp ${business.whatsapp}   ·   ${business.area}`), textX, 21.5);
  return bandH + 16;
}

function drawBolt(doc: jsPDF, x: number, y: number, height: number): void {
  const scale = height / 56; // alto del rayo en la grilla (4 → 60)
  const points = BOLT.map(([px, py]) => [x + (px - 14) * scale, y + (py - 4) * scale] as const);
  const [first, ...rest] = points;
  if (!first) return;
  let prev = first;
  const deltas = rest.map((point) => {
    const delta = [point[0] - prev[0], point[1] - prev[1]];
    prev = point;
    return delta;
  });
  doc.setFillColor(...YELLOW);
  doc.lines(deltas, first[0], first[1], [1, 1], 'F', true);
}

function drawTitle(doc: jsPDF, quote: Quote, y: number): number {
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(20);
  doc.setTextColor(...INK);
  doc.text('PRESUPUESTO', PAGE.margin, y);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10.5);
  doc.text(formatDate(quote.date), RIGHT, y, { align: 'right' });
  const dateWidth = doc.getTextWidth(formatDate(quote.date));
  doc.setTextColor(...MUTED);
  doc.text('Fecha ', RIGHT - dateWidth, y, { align: 'right' });

  let next = y + 8;
  if (quote.clientName) {
    doc.setFontSize(11);
    doc.setTextColor(...MUTED);
    doc.text('Cliente', PAGE.margin, next);
    doc.setTextColor(...INK);
    doc.setFont('helvetica', 'bold');
    doc.text(pdfText(quote.clientName), PAGE.margin + 15, next);
    next += 8;
  }
  return next + 2;
}

function drawTableHeader(doc: jsPDF, y: number): number {
  const h = 8;
  doc.setFillColor(...INK);
  doc.rect(PAGE.margin, y, RIGHT - PAGE.margin, h, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(...YELLOW);
  const baseline = y + 5.4;
  spacedText(doc, 'CANT.', COL.qty, baseline);
  spacedText(doc, 'SERVICIO', COL.name, baseline);
  spacedText(doc, 'SUBTOTAL', COL.subtotal, baseline, 'right');
  return y + h;
}

/** Texto con espaciado entre letras. `align: 'right'` de jsPDF no cuenta ese espaciado, así que lo calculamos acá. */
function spacedText(doc: jsPDF, text: string, x: number, y: number, align: 'left' | 'right' = 'left', space = 0.4): void {
  const width = doc.getTextWidth(text) + space * (text.length - 1);
  doc.setCharSpace(space);
  doc.text(text, align === 'right' ? x - width : x, y);
  doc.setCharSpace(0);
}

function drawLine(doc: jsPDF, line: QuoteLine, y: number): number {
  const setRowFont = (style: 'normal' | 'bold') => {
    doc.setFont('helvetica', style);
    doc.setFontSize(10.5);
  };
  setRowFont('normal');
  const nameLines = doc.splitTextToSize(pdfText(lineLabel(line)), NAME_WIDTH) as string[];
  const rowH = 5 + nameLines.length * NAME_LINE_H + 5;

  let top = y;
  if (top + rowH > PAGE.height - FOOTER_SPACE) {
    doc.addPage();
    top = drawTableHeader(doc, PAGE.margin); // cambia la fuente: se vuelve a setear abajo
  }

  const baseline = top + 6.2;
  doc.setTextColor(...INK);
  setRowFont('bold');
  doc.text(String(line.quantity), COL.qty, baseline);
  doc.text(pdfText(formatMoney(line.subtotal)), COL.subtotal, baseline, { align: 'right' });
  setRowFont('normal');
  nameLines.forEach((text, i) => doc.text(text, COL.name, baseline + i * NAME_LINE_H));

  doc.setFontSize(8.5);
  doc.setTextColor(...MUTED);
  const detailY = baseline + nameLines.length * NAME_LINE_H - 0.4;
  doc.text(pdfText(`${formatMoney(line.unitPrice)} por ${line.unit}`), COL.name, detailY);

  const bottom = top + rowH;
  doc.setDrawColor(...RULE);
  doc.setLineWidth(0.25);
  doc.line(PAGE.margin, bottom, RIGHT, bottom);
  return bottom;
}

function drawTotal(doc: jsPDF, total: number, y: number): void {
  const h = 15;
  const w = 92;
  let top = y + 7;
  if (top + h > PAGE.height - FOOTER_SPACE) {
    doc.addPage();
    top = PAGE.margin;
  }
  const x = RIGHT - w;
  doc.setFillColor(...INK);
  doc.rect(x, top, w, h, 'F');
  doc.setFillColor(...YELLOW);
  doc.rect(x, top, 2.2, h, 'F');

  doc.setTextColor(...YELLOW);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  spacedText(doc, 'TOTAL', x + 7, top + 9.3, 'left', 0.6);
  doc.setFontSize(17);
  doc.text(pdfText(formatMoney(total)), RIGHT - 5, top + 10, { align: 'right' });
}

function drawFooters(doc: jsPDF, business: Business, footer: string): void {
  const pages = doc.getNumberOfPages();
  for (let page = 1; page <= pages; page++) {
    doc.setPage(page);
    const y = PAGE.height - 15;
    doc.setDrawColor(...RULE);
    doc.setLineWidth(0.25);
    doc.line(PAGE.margin, y - 6, RIGHT, y - 6);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(...INK);
    doc.text(pdfText(footer), PAGE.margin, y);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(...MUTED);
    doc.text(pdfText(`${business.name}  ·  WhatsApp ${business.whatsapp}`), PAGE.margin, y + 5);
    if (pages > 1) doc.text(`${page}/${pages}`, RIGHT, y + 5, { align: 'right' });
  }
}
