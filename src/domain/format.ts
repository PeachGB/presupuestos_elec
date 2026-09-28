const money = new Intl.NumberFormat('es-AR', {
  style: 'currency',
  currency: 'ARS',
  maximumFractionDigits: 0,
});

const date = new Intl.DateTimeFormat('es-AR', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
});

/** "$ 48.000" (con espacio duro entre el signo y el número, como lo da Intl). */
export function formatMoney(amount: number): string {
  return money.format(amount);
}

/** "28/09/2026" */
export function formatDate(value: Date): string {
  return date.format(value);
}

/** "2026-09-28", para nombres de archivo. Usa la fecha local, no UTC. */
export function isoDate(value: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${value.getFullYear()}-${pad(value.getMonth() + 1)}-${pad(value.getDate())}`;
}
