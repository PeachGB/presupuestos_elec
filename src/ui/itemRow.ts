import { parsePrice } from '../domain/catalog';
import { formatMoney } from '../domain/format';
import { lineTotal, unitPrice } from '../domain/quote';
import type { Service, Variant } from '../domain/types';
import {
  isPriceOverridden,
  quantityOf,
  setPrice,
  setQuantity,
  setVariant,
  stepQuantity,
  variantOf,
  type AppState,
} from '../state/state';
import type { Store } from '../state/store';
import { h } from './dom';
import type { Notify } from './toast';

export interface ItemRow {
  el: HTMLLIElement;
  update(state: AppState): void;
}

const VARIANT_LABELS: Record<Variant, string> = { embutido: 'Embutido', exterior: 'Exterior' };

/** Fila de un servicio: nombre, precio editable, toggle de variante y stepper. */
export function createItemRow(service: Service, store: Store<AppState>, notify: Notify): ItemRow {
  const nameId = `name-${service.id}`;
  const price = h('button', { class: 'price', type: 'button' });
  const editedTag = h('span', { class: 'edited-tag', hidden: true }, 'editado');
  const priceWrap = h('span', { class: 'price-wrap' }, price, h('span', { class: 'unit' }, `/ ${service.unit}`));
  const meta = h('div', { class: 'item-meta' }, priceWrap, editedTag);

  const radios = createVariantToggle(service, store, meta, priceWrap);
  const { stepper, qty, subtotal } = createStepper(service, store, nameId);
  meta.append(subtotal);

  const el = h('li', { class: 'item' }, h('div', { class: 'item-name', id: nameId }, service.name), stepper, meta);

  price.addEventListener('click', () => editPrice(service, store, notify, price));

  function update(state: AppState): void {
    const quantity = quantityOf(state, service.id);
    const variant = variantOf(state, service);
    const current = unitPrice(service, variant, state.overrides);
    const edited = isPriceOverridden(state, service);

    el.classList.toggle('is-selected', quantity > 0);
    price.textContent = formatMoney(current);
    price.setAttribute('aria-label', `Editar precio: ${formatMoney(current)} por ${service.unit}${edited ? ' (editado)' : ''}`);
    editedTag.hidden = !edited;
    const radio = variant ? radios.get(variant) : undefined;
    if (radio && !radio.checked) radio.checked = true;
    // No pisar lo que el usuario está tipeando (por ejemplo, un campo vacío).
    if (document.activeElement !== qty) qty.value = String(quantity);
    subtotal.textContent = quantity > 0 ? formatMoney(lineTotal(quantity, current)) : '';
  }

  return { el, update };
}

function createVariantToggle(
  service: Service,
  store: Store<AppState>,
  meta: HTMLElement,
  priceWrap: HTMLElement,
): Map<Variant, HTMLInputElement> {
  const radios = new Map<Variant, HTMLInputElement>();
  const variants = service.options.flatMap((o) => (o.variant ? [o.variant] : []));

  if (service.options.length === 1) {
    // Servicio con una sola variante en el CSV: se muestra como etiqueta, sin toggle.
    if (variants[0]) priceWrap.append(h('span', { class: 'unit' }, `· ${variants[0]}`));
    return radios;
  }

  const fieldset = h('fieldset', { class: 'variant' }, h('legend', { class: 'sr-only' }, `Instalación de ${service.name}`));
  for (const variant of variants) {
    const input = h('input', { type: 'radio', name: `variant-${service.id}`, value: variant });
    input.addEventListener('change', () => {
      if (input.checked) store.update((s) => setVariant(s, service.id, variant));
    });
    radios.set(variant, input);
    fieldset.append(h('label', {}, input, h('span', {}, VARIANT_LABELS[variant])));
  }
  meta.append(fieldset);
  return radios;
}

function createStepper(service: Service, store: Store<AppState>, nameId: string) {
  const minus = h('button', { class: 'step', type: 'button', 'aria-label': 'Restar uno' }, '−');
  const plus = h('button', { class: 'step', type: 'button', 'aria-label': 'Sumar uno' }, '+');
  const qty = h('input', {
    class: 'qty',
    type: 'text',
    inputmode: 'numeric',
    pattern: '[0-9]*',
    autocomplete: 'off',
    enterkeyhint: 'done',
    'aria-label': 'Cantidad',
  });
  const stepper = h('div', { class: 'stepper', role: 'group', 'aria-labelledby': nameId }, minus, qty, plus);
  const subtotal = h('div', { class: 'item-subtotal' });

  minus.addEventListener('click', () => store.update((s) => stepQuantity(s, service.id, -1)));
  plus.addEventListener('click', () => store.update((s) => stepQuantity(s, service.id, 1)));
  // Seleccionar todo al enfocar: tipear "12" reemplaza en vez de sumar dígitos.
  qty.addEventListener('focus', () => setTimeout(() => qty.select(), 0));
  qty.addEventListener('input', () => {
    const digits = qty.value.replace(/\D/g, '').slice(0, 3);
    if (digits !== qty.value) qty.value = digits;
    store.update((s) => setQuantity(s, service.id, digits === '' ? 0 : Number(digits)));
  });
  qty.addEventListener('blur', () => {
    qty.value = String(quantityOf(store.get(), service.id));
  });
  qty.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') qty.blur();
  });

  return { stepper, qty, subtotal };
}

/**
 * Reemplaza el botón de precio por un input. Enter o salir del campo guarda;
 * Escape cancela; vacío vuelve al precio de la lista.
 */
function editPrice(service: Service, store: Store<AppState>, notify: Notify, button: HTMLButtonElement): void {
  const state = store.get();
  const variant = variantOf(state, service);
  const input = h('input', {
    class: 'price-input',
    type: 'text',
    inputmode: 'numeric',
    pattern: '[0-9]*',
    autocomplete: 'off',
    enterkeyhint: 'done',
    value: String(unitPrice(service, variant, state.overrides)),
    'aria-label': `Precio de ${service.name}${variant ? ` ${variant}` : ''}. Vacío vuelve al precio de la lista.`,
  });
  button.replaceWith(input);
  input.focus();
  input.select();

  let finished = false;
  const finish = (commit: boolean, refocus: boolean) => {
    if (finished) return;
    finished = true;
    if (commit) {
      const raw = input.value.trim();
      const next = raw === '' ? null : parsePrice(raw);
      if (raw !== '' && next === null) notify('Precio inválido: no se guardó.');
      else store.update((s) => setPrice(s, service, variant, next));
    }
    input.replaceWith(button);
    if (refocus) button.focus();
  };

  input.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' || event.key === 'Escape') {
      event.preventDefault();
      finish(event.key === 'Enter', true);
    }
  });
  input.addEventListener('blur', () => finish(true, false));
}
