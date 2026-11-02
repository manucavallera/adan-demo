// Lectura del catálogo y la configuración desde la base de datos, para la web y el bot.
// Se guarda en caché y se refresca cuando el dueño cambia algo en el panel (revalidateShop).
import "server-only";
import { revalidateTag, unstable_cache } from "next/cache";
import { prisma } from "./db";
import type { Product } from "./products";
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
  return {
    id: p.id,
    slug: p.slug,
    name: p.name,
    category: p.category as Product["category"],
    price: p.price,
    image: p.images[0] ?? "/img/sin-foto.svg",
    images: p.images,
    color: p.color,
    description: p.description,
    sizes: p.variants.map((v) => v.size),
    stock: Object.fromEntries(p.variants.map((v) => [v.size, v.stock])),
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
      const { id, ...rest } = s;
      settings = rest;
    }
    return { products: rows.map(toProduct), settings };
  },
  ["shop"],
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
