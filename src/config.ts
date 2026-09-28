/**
 * Datos del negocio. Único lugar a editar para cambiar nombre, contacto o
 * condiciones que salen en el texto de WhatsApp y en el PDF.
 */
export interface Business {
  name: string;
  /** Tal como querés que se lea en el PDF. */
  whatsapp: string;
  area: string;
}

export const BUSINESS: Business = {
  name: 'Electricista Mateos',
  whatsapp: '+54 9 221 631-9417',
  area: 'La Plata y alrededores',
};

export const QUOTE_VALIDITY_DAYS = 7;

/** Pie obligatorio: todos los precios son mano de obra. */
export const QUOTE_FOOTER = `Mano de obra. Materiales aparte. Válido ${QUOTE_VALIDITY_DAYS} días.`;
