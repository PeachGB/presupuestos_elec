/** Copia al portapapeles. Usa la API moderna y, si no está o falla, `execCommand`. */
export async function copyText(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // Permiso denegado o navegador viejo: probamos el método clásico.
  }
  return legacyCopy(text);
}

function legacyCopy(text: string): boolean {
  const area = document.createElement('textarea');
  area.value = text;
  area.setAttribute('readonly', '');
  Object.assign(area.style, { position: 'fixed', top: '0', left: '0', opacity: '0' });
  const previousFocus = document.activeElement;
  document.body.append(area);
  area.select();
  area.setSelectionRange(0, text.length); // iOS
  let ok = false;
  try {
    ok = document.execCommand('copy');
  } catch {
    ok = false;
  }
  area.remove();
  if (previousFocus instanceof HTMLElement) previousFocus.focus({ preventScroll: true });
  return ok;
}
