import type { AppState } from '../state/state';
import type { Store } from '../state/store';
import { h } from './dom';
import { createItemRow, type ItemRow } from './itemRow';
import type { Notify } from './toast';

/** Dibuja el catálogo una sola vez y devuelve la función que lo actualiza. */
export function renderCatalog(container: HTMLElement, store: Store<AppState>, notify: Notify): (state: AppState) => void {
  const rows: ItemRow[] = [];
  const sections = store.get().catalog.categories.map((category, i) => {
    const titleId = `category-${i}`;
    const list = h('ul', { class: 'items', role: 'list' });
    for (const service of category.services) {
      const row = createItemRow(service, store, notify);
      rows.push(row);
      list.append(row.el);
    }
    return h(
      'section',
      { class: 'category', 'aria-labelledby': titleId },
      h('h2', { class: 'category-title', id: titleId }, category.name),
      list,
    );
  });
  container.replaceChildren(...sections);
  return (state) => {
    for (const row of rows) row.update(state);
  };
}
