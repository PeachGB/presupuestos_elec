import { BUSINESS, QUOTE_FOOTER } from '../config';
import { formatDate, formatMoney } from '../domain/format';
import { buildQuote } from '../domain/quote';
import type { Quote } from '../domain/types';
import { quoteToWhatsAppText } from '../domain/whatsapp';
import { canShareFiles, downloadBlob, pdfFileName, shareOrDownload } from '../pdf/deliver';
import { lineItems, newQuote, resetPrices, setClientName, type AppState } from '../state/state';
import type { Store } from '../state/store';
import { renderCatalog } from './catalogView';
import { copyText } from './clipboard';
import { qs } from './dom';
import { createToast, type Notify } from './toast';

export function currentQuote(state: AppState): Quote {
  return buildQuote(state.catalog, lineItems(state), state.overrides, state.draft.clientName, new Date());
}

export function mountApp(store: Store<AppState>): void {
  const notify = createToast(qs('#toast'));
  const updateCatalog = renderCatalog(qs('#catalog'), store, notify);
  const clientInput = qs('#client-name', HTMLInputElement);
  const resetButton = qs('#reset-prices', HTMLButtonElement);
  const totalEl = qs('#total');
  const countEl = qs('#item-count');

  clientInput.addEventListener('input', () => store.update((s) => setClientName(s, clientInput.value)));
  clientInput.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') clientInput.blur();
  });

  qs('#new-quote', HTMLButtonElement).addEventListener('click', () => {
    const { draft } = store.get();
    const hasWork = Object.keys(draft.quantities).length > 0 || draft.clientName.trim() !== '';
    const message = '¿Empezar un presupuesto nuevo?\nSe borran cantidades y cliente. Los precios editados se mantienen.';
    if (hasWork && !window.confirm(message)) return;
    store.update(newQuote);
    window.scrollTo({ top: 0 });
    notify('Presupuesto nuevo.');
  });

  resetButton.addEventListener('click', () => {
    const count = Object.keys(store.get().overrides).length;
    if (!window.confirm(`¿Volver a los precios de la lista?\nSe descartan ${plural(count, 'precio editado', 'precios editados')}.`)) return;
    store.update(resetPrices);
    notify('Precios restaurados.');
  });

  setupCopy(store, notify);
  setupPdf(store, notify);

  const render = (state: AppState) => {
    updateCatalog(state);
    const quote = currentQuote(state);
    totalEl.textContent = formatMoney(quote.total);
    countEl.textContent = `· ${quote.lines.length === 0 ? 'Sin ítems' : plural(quote.lines.length, 'ítem', 'ítems')}`;
    const edited = Object.keys(state.overrides).length;
    resetButton.disabled = edited === 0;
    resetButton.textContent = edited === 0 ? 'Restaurar precios' : `Restaurar precios (${edited})`;
    if (document.activeElement !== clientInput) clientInput.value = state.draft.clientName;
  };
  store.subscribe(render);
  render(store.get());
  trackHeight(qs('#totalbar'), '--bar-h');
}

function setupCopy(store: Store<AppState>, notify: Notify): void {
  const button = qs('#copy', HTMLButtonElement);
  const label = button.textContent ?? '';
  let timer: ReturnType<typeof setTimeout> | undefined;

  button.addEventListener('click', async () => {
    const quote = currentQuote(store.get());
    if (quote.lines.length === 0) return notify('Agregá al menos un ítem.');
    const ok = await copyText(quoteToWhatsAppText(quote, { businessName: BUSINESS.name, footer: QUOTE_FOOTER }));
    if (!ok) return notify('No se pudo copiar. Probá de nuevo.');
    button.textContent = '✓ Copiado';
    button.classList.add('is-done');
    clearTimeout(timer);
    timer = setTimeout(() => {
      button.textContent = label;
      button.classList.remove('is-done');
    }, 1800);
    notify('Copiado. Pegalo en WhatsApp.');
  });
}

// jsPDF va en un chunk aparte para que la app abra rápido. Se precarga apenas
// la app queda libre: así "Compartir" no pierde el gesto del usuario esperando
// la descarga del módulo (Safari lo exige), y queda cacheado para offline.
type PdfModule = typeof import('../pdf/quotePdf');
let pdfModule: Promise<PdfModule> | undefined;

function loadPdf(): Promise<PdfModule> {
  pdfModule ??= import('../pdf/quotePdf').catch((error: unknown) => {
    pdfModule = undefined; // reintentar la próxima vez
    throw error;
  });
  return pdfModule;
}

function setupPdf(store: Store<AppState>, notify: Notify): void {
  const download = qs('#pdf-download', HTMLButtonElement);
  const share = qs('#pdf-share', HTMLButtonElement);
  share.hidden = !canShareFiles();
  setTimeout(() => void loadPdf().catch(() => undefined), 1500);

  async function makePdf(): Promise<{ blob: Blob; quote: Quote } | null> {
    const quote = currentQuote(store.get());
    if (quote.lines.length === 0) {
      notify('Agregá al menos un ítem.');
      return null;
    }
    try {
      const { renderQuotePdf } = await loadPdf();
      return { blob: renderQuotePdf(quote, BUSINESS, QUOTE_FOOTER), quote };
    } catch (error) {
      console.error(error);
      notify('No se pudo generar el PDF.');
      return null;
    }
  }

  download.addEventListener('click', async () => {
    const pdf = await makePdf();
    if (!pdf) return;
    downloadBlob(pdf.blob, pdfFileName(pdf.quote));
    notify('PDF descargado.');
  });

  share.addEventListener('click', async () => {
    const pdf = await makePdf();
    if (!pdf) return;
    const result = await shareOrDownload(pdf.blob, pdfFileName(pdf.quote), `Presupuesto ${formatDate(pdf.quote.date)}`);
    if (result === 'downloaded') notify('No se pudo compartir: se descargó el PDF.');
  });
}

function plural(n: number, one: string, many: string): string {
  return `${n} ${n === 1 ? one : many}`;
}

/** Publica la altura real de un elemento como variable CSS (la barra fija cambia con la fuente). */
function trackHeight(el: HTMLElement, cssVar: string): void {
  const apply = () => document.documentElement.style.setProperty(cssVar, `${el.offsetHeight}px`);
  apply();
  if ('ResizeObserver' in window) new ResizeObserver(apply).observe(el);
}
