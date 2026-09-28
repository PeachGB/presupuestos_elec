import type { Catalog, LineItem, PriceOverrides, Quote, QuoteLine, Service, ServiceOption, Variant } from './types';

/** Clave de override: un precio por servicio y variante. */
export function priceKey(serviceId: string, variant: Variant | null): string {
  return `${serviceId}::${variant ?? 'base'}`;
}

/** Opción elegida del servicio. Si la variante no existe, cae en la primera (la de por defecto). */
export function selectOption(service: Service, variant: Variant | null): ServiceOption {
  const option = service.options.find((o) => o.variant === variant) ?? service.options[0];
  if (!option) throw new Error(`El servicio "${service.name}" no tiene precios.`);
  return option;
}

/** Precio unitario efectivo: override del usuario o el del CSV. */
export function unitPrice(service: Service, variant: Variant | null, overrides: PriceOverrides): number {
  const option = selectOption(service, variant);
  return overrides[priceKey(service.id, option.variant)] ?? option.price;
}

export function lineTotal(quantity: number, price: number): number {
  return quantity * price;
}

export function quoteTotal(lines: readonly Pick<QuoteLine, 'subtotal'>[]): number {
  return lines.reduce((sum, line) => sum + line.subtotal, 0);
}

/**
 * Arma el presupuesto a partir de lo cargado. Ignora cantidades ≤ 0 e ids que
 * ya no estén en el catálogo (por ejemplo, si se borró un servicio del CSV).
 * Las líneas salen en el orden del catálogo, no en el de carga.
 */
export function buildQuote(
  catalog: Catalog,
  items: readonly LineItem[],
  overrides: PriceOverrides,
  clientName: string,
  date: Date,
): Quote {
  const byService = new Map(items.filter((i) => i.quantity > 0).map((i) => [i.serviceId, i]));
  const lines: QuoteLine[] = [];

  for (const category of catalog.categories) {
    for (const service of category.services) {
      const item = byService.get(service.id);
      if (!item) continue;
      const option = selectOption(service, item.variant);
      const price = unitPrice(service, option.variant, overrides);
      lines.push({
        serviceId: service.id,
        name: service.name,
        unit: service.unit,
        variant: option.variant,
        quantity: item.quantity,
        unitPrice: price,
        subtotal: lineTotal(item.quantity, price),
      });
    }
  }

  return { clientName: clientName.trim(), date, lines, total: quoteTotal(lines) };
}
