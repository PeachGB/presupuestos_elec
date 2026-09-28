import './styles.css';
import { parseCatalog } from './domain/catalog';
import { getStorage, loadDraft, loadOverrides, saveDraft, saveOverrides } from './state/persistence';
import type { AppState } from './state/state';
import { createStore } from './state/store';
import { mountApp } from './ui/app';
import { h, qs } from './ui/dom';

const CSV_URL = `${import.meta.env.BASE_URL}lista-precios.csv`;

async function start(): Promise<void> {
  const container = qs('#catalog');
  try {
    const response = await fetch(CSV_URL);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const { catalog, warnings } = parseCatalog(await response.text());
    if (warnings.length > 0) console.warn(`lista-precios.csv:\n${warnings.join('\n')}`);

    const storage = getStorage();
    const store = createStore<AppState>({
      catalog,
      draft: loadDraft(storage),
      overrides: loadOverrides(storage),
    });
    store.subscribe((state, previous) => {
      if (state.draft !== previous.draft) saveDraft(storage, state.draft);
      if (state.overrides !== previous.overrides) saveOverrides(storage, state.overrides);
    });
    mountApp(store);
  } catch (error) {
    console.error(error);
    const retry = h('button', { class: 'btn btn-secondary', type: 'button' }, 'Reintentar');
    retry.addEventListener('click', () => window.location.reload());
    container.replaceChildren(
      h('p', { class: 'status status-error', role: 'alert' }, 'No se pudo cargar la lista de precios. Revisá la conexión y reintentá.'),
      retry,
    );
  }
}

function registerServiceWorker(): void {
  if (!import.meta.env.PROD || !('serviceWorker' in navigator)) return;
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch((error: unknown) => console.warn('Service worker:', error));
  });
}

registerServiceWorker();
void start();
