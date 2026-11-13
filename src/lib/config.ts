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
  shippingZones: ShippingZone[]; // vacío = un solo costo para todos (shippingCost)
  transferDiscount: number; // porcentaje
  transferAlias: string;
  transferCbu: string;
  transferHolder: string;
  legalName: string;
  cuit: string;
  email: string;
};

export function waLink(phone: string, message: string) {
  return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
}

// Zona de envío. price null = "a coordinar": el dueño arregla el precio por WhatsApp.
export type ShippingZone = { name: string; price: number | null };

export function parseZones(raw: unknown): ShippingZone[] {
  if (!Array.isArray(raw)) return [];
  const seen = new Set<string>();
  const out: ShippingZone[] = [];
  for (const z of raw.slice(0, 20)) {
    const name = typeof z?.name === "string" ? z.name.trim().slice(0, 60) : "";
    if (!name || seen.has(name.toLowerCase())) continue;
    seen.add(name.toLowerCase());
    const n = Number(z?.price);
    out.push({ name, price: z?.price === null || z?.price === "" || !Number.isFinite(n) ? null : Math.max(0, Math.round(n)) });
  }
  return out;
}

const freeFor = (subtotal: number, s: Settings) => s.freeShippingFrom > 0 && subtotal >= s.freeShippingFrom;

// Costo de envío. Sin zonas: un solo costo. Con zonas: el de la zona elegida.
// Devuelve null si falta elegir zona o si la zona es "a coordinar".
export function shippingFor(subtotal: number, s: Settings, zone?: string): number | null {
  if (subtotal === 0) return 0;
  if (s.shippingZones.length === 0) return freeFor(subtotal, s) ? 0 : s.shippingCost;
  const z = s.shippingZones.find((x) => x.name === zone);
  if (!z || z.price === null) return null;
  return freeFor(subtotal, s) ? 0 : z.price;
}

// Texto corto del precio de una zona: "Gratis", "$ 3.000" o "A coordinar".
export function zonePriceLabel(subtotal: number, s: Settings, z: ShippingZone) {
  if (z.price === null) return "A coordinar";
  return freeFor(subtotal, s) || z.price === 0 ? "Gratis" : formatPrice(z.price);
}

export function formatPrice(value: number) {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  }).format(value);
}
