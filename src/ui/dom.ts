type AttrValue = string | number | boolean | undefined;

/** Crea un elemento. `true` agrega el atributo vacío; `false`/`undefined` lo omite. */
export function h<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  attrs: Record<string, AttrValue> = {},
  ...children: (Node | string)[]
): HTMLElementTagNameMap[K] {
  const el = document.createElement(tag);
  for (const [name, value] of Object.entries(attrs)) {
    if (value === undefined || value === false) continue;
    el.setAttribute(name, value === true ? '' : String(value));
  }
  el.append(...children);
  return el;
}

/** `querySelector` que falla fuerte si el elemento no existe o no es del tipo esperado. */
export function qs<T extends Element = HTMLElement>(
  selector: string,
  type: abstract new () => T = HTMLElement as unknown as abstract new () => T,
): T {
  const el = document.querySelector(selector);
  if (!(el instanceof type)) throw new Error(`Falta el elemento ${selector}`);
  return el;
}
