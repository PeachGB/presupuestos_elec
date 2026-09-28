import { isoDate } from '../domain/format';
import { slug } from '../domain/slug';
import type { Quote } from '../domain/types';

/** "presupuesto-2026-09-28-juan-perez.pdf" */
export function pdfFileName(quote: Pick<Quote, 'date' | 'clientName'>): string {
  const client = slug(quote.clientName);
  return `presupuesto-${isoDate(quote.date)}${client ? `-${client}` : ''}.pdf`;
}

/** ¿El dispositivo puede compartir archivos (Web Share API nivel 2)? */
export function canShareFiles(): boolean {
  try {
    const probe = new File(['%PDF'], 'probe.pdf', { type: 'application/pdf' });
    return typeof navigator.canShare === 'function' && navigator.canShare({ files: [probe] });
  } catch {
    return false;
  }
}

export function downloadBlob(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.append(link);
  link.click();
  link.remove();
  // Safari necesita que la URL siga viva un rato después del click.
  setTimeout(() => URL.revokeObjectURL(url), 30_000);
}

export type ShareResult = 'shared' | 'cancelled' | 'downloaded';

/** Comparte el PDF (por ejemplo, a WhatsApp). Si no se puede, lo descarga. */
export async function shareOrDownload(blob: Blob, fileName: string, title: string): Promise<ShareResult> {
  const file = new File([blob], fileName, { type: 'application/pdf' });
  if (typeof navigator.canShare === 'function' && navigator.canShare({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title });
      return 'shared';
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return 'cancelled';
      // NotAllowedError u otro: caemos a la descarga.
    }
  }
  downloadBlob(blob, fileName);
  return 'downloaded';
}
