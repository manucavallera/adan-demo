// Datos de la tienda (sacados del Instagram @adanindumentaria_).
export const store = {
  name: "ADAN",
  tagline: "Indumentaria masculina, formal y urbana",
  // Número en formato internacional sin "+" ni espacios (ej: 5493431234567).
  // Es un número de ejemplo: reemplazar por el WhatsApp real de la tienda.
  whatsapp: "5493430000000",
  instagram: "adanindumentaria_",
  address: "Sarmiento 330",
  city: "Viale, Entre Ríos",
  installments: "3 cuotas sin interés",
  shippingNote: "Envíos a todo el país. Retiro gratis en el local, Sarmiento 330, Viale.",
  // Valores de ejemplo hasta tener los reales.
  freeShippingFrom: 150000,
  shippingCost: 7500,
  // Demo: los botones de WhatsApp abren el asistente de prueba en vez de WhatsApp.
  demoBot: true,
};

export function waLink(message: string) {
  return `https://wa.me/${store.whatsapp}?text=${encodeURIComponent(message)}`;
}

export function formatPrice(value: number) {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  }).format(value);
}
