// Datos fijos de la marca. Lo que el dueño puede cambiar (WhatsApp, dirección, envíos, pagos)
// está en la tabla Settings y se edita desde el panel.
export const store = {
  name: "ADAN",
  tagline: "Indumentaria masculina, formal y urbana",
  instagram: "adanindumentaria_",
  // Demo: los botones de WhatsApp abren el asistente de prueba en vez de WhatsApp.
  demoBot: process.env.NEXT_PUBLIC_DEMO_BOT === "1",
};

export type Settings = {
  whatsapp: string; // formato internacional sin "+" ni espacios (ej: 5493431234567)
  address: string;
  city: string;
  hours: string;
  installments: string;
  shippingCost: number;
  freeShippingFrom: number; // 0 = sin envío gratis
  transferDiscount: number; // porcentaje
  transferAlias: string;
  transferCbu: string;
  transferHolder: string;
};

export function waLink(phone: string, message: string) {
  return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
}

export function shippingFor(subtotal: number, s: Settings) {
  if (subtotal === 0) return 0;
  if (s.freeShippingFrom > 0 && subtotal >= s.freeShippingFrom) return 0;
  return s.shippingCost;
}

export function formatPrice(value: number) {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  }).format(value);
}
