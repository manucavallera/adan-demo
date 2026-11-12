// Lectura del catálogo y la configuración desde la base de datos, para la web y el bot.
// Se guarda en caché y se refresca cuando el dueño cambia algo en el panel (revalidateShop).
import "server-only";
import { revalidateTag, unstable_cache } from "next/cache";
import { prisma } from "./db";
import { parseColors, stockKey, type Product } from "./products";
import type { Settings } from "./config";

const TAG = "shop";

type Row = Awaited<ReturnType<typeof loadRows>>[number];

function loadRows(includeInactive: boolean) {
  return prisma.product.findMany({
    where: includeInactive ? {} : { active: true },
    include: { variants: { orderBy: [{ sort: "asc" }, { id: "asc" }] } },
    orderBy: [{ sort: "asc" }, { createdAt: "asc" }],
  });
}

export function toProduct(p: Row): Product {
  const colors = parseColors(p.colors);
  return {
    id: p.id,
    slug: p.slug,
    name: p.name,
    category: p.category as Product["category"],
    price: p.price,
    oldPrice: p.oldPrice > p.price ? p.oldPrice : undefined,
    image: p.images[0] ?? "/img/sin-foto.svg",
    images: p.images,
    color: colors.length ? colors.map((c) => c.name).join(", ") : p.color,
    description: p.description,
    colors,
    sizes: [...new Set(p.variants.map((v) => v.size))],
    stock: Object.fromEntries(p.variants.map((v) => [stockKey(v.color, v.size), v.stock])),
    isNew: p.isNew,
  };
}

const DEFAULT_SETTINGS: Settings = {
  whatsapp: "",
  address: "",
  city: "",
  hours: "",
  installments: "",
  shippingCost: 0,
  freeShippingFrom: 0,
  transferDiscount: 0,
  transferAlias: "",
  transferCbu: "",
  transferHolder: "",
  legalName: "",
  cuit: "",
  email: "",
};

export const getShop = unstable_cache(
  async () => {
    const [rows, s] = await Promise.all([
      loadRows(false),
      prisma.settings.findUnique({ where: { id: 1 } }),
    ]);
    let settings = DEFAULT_SETTINGS;
    if (s) {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { id, ignoredNumbers, ...rest } = s; // la lista de ignorados no va a la web
      settings = rest;
    }
    return { products: rows.map(toProduct), settings };
  },
  ["shop"],
  { tags: [TAG] },
);

// Últimos 10 dígitos (característica + número). Así "343 15 412-3456", "+54 9 343 4123456"
// y el formato de WhatsApp (5493434123456) dan lo mismo.
export function phoneKey(raw: string) {
  const d = raw.replace(/\D/g, "");
  // Formato local con 15: característica (2-4 dígitos) + 15 + número = 12 dígitos en total.
  const local = d.replace(/^0/, "");
  if (local.length === 12 && !local.startsWith("54")) {
    for (const area of [2, 3, 4]) {
      if (local.slice(area, area + 2) === "15") return (local.slice(0, area) + local.slice(area + 2)).slice(-10);
    }
  }
  return d.slice(-10);
}

// Números que el bot ignora (se cargan en Ajustes). Comparten caché con el resto de la tienda.
export const getIgnoredNumbers = unstable_cache(
  async () => {
    const s = await prisma.settings.findUnique({ where: { id: 1 }, select: { ignoredNumbers: true } });
    return (s?.ignoredNumbers ?? "")
      .split("\n")
      .map(phoneKey)
      .filter((k) => k.length >= 8);
  },
  ["ignored-numbers"],
  { tags: [TAG] },
);

export type Shop = Awaited<ReturnType<typeof getShop>>;

export async function getProductBySlug(slug: string) {
  const { products } = await getShop();
  return products.find((p) => p.slug === slug);
}

export function revalidateShop() {
  revalidateTag(TAG);
}
