// Tipos y categorías del catálogo. Las prendas viven en la base de datos: las carga el dueño
// desde el panel (/admin) y las leen la web y el bot (ver src/lib/shop.ts).

export const CATEGORY_IDS = [
  "remeras",
  "camisas",
  "chombas",
  "buzos",
  "sweaters",
  "camperas",
  "sacos",
  "pantalones",
  "jeans",
  "bermudas",
  "mallas",
  "calzado",
  "gorras",
  "accesorios",
] as const;
export type Category = (typeof CATEGORY_IDS)[number];

// Talles de letra, para el filtro del catálogo. Cada prenda define los suyos en `stock`
// (los pantalones de vestir van por número, las gorras son talle único).
export const SIZES = ["S", "M", "L", "XL", "XXL"] as const;
export type Size = string;

// Un color de la prenda, con sus fotos. `hex` es el circulito que se ve en la web.
export type ProductColor = { name: string; hex: string; images: string[] };

export type Product = {
  id: string; // código que viaja en el mensaje de WhatsApp
  slug: string;
  name: string;
  category: Category;
  price: number;
  image: string; // foto principal
  images: string[];
  color: string;
  description: string;
  colors: ProductColor[]; // vacío = un solo color
  sizes: Size[]; // talles en el orden en que se muestran (sin repetir)
  stock: Record<string, number>; // clave: stockKey(color, talle)
  isNew?: boolean;
};

// Todas las categorías que el dueño puede elegir en el panel. La web muestra solo las que tienen
// prendas visibles (ver shopCategories). `image` es la foto de reserva si la categoría no tiene fotos.
export type CategoryGroup = "Parte de arriba" | "Abrigo" | "Parte de abajo" | "Calzado y accesorios";

export const categories: { id: Category; label: string; group: CategoryGroup; image?: string }[] = [
  { id: "remeras", label: "Remeras", group: "Parte de arriba", image: "/img/adan/remera-box-logo.jpg" },
  { id: "camisas", label: "Camisas", group: "Parte de arriba" },
  { id: "chombas", label: "Chombas", group: "Parte de arriba" },
  { id: "buzos", label: "Buzos", group: "Abrigo" },
  { id: "sweaters", label: "Sweaters", group: "Abrigo" },
  { id: "camperas", label: "Camperas", group: "Abrigo", image: "/img/adan/campera-rompeviento.jpg" },
  { id: "sacos", label: "Sacos y trajes", group: "Abrigo" },
  { id: "pantalones", label: "Pantalones", group: "Parte de abajo", image: "/img/adan/pantalon-vestir.jpg" },
  { id: "jeans", label: "Jeans", group: "Parte de abajo" },
  { id: "bermudas", label: "Bermudas", group: "Parte de abajo", image: "/img/adan/bermuda-surf.jpg" },
  { id: "mallas", label: "Mallas", group: "Parte de abajo" },
  { id: "calzado", label: "Calzado", group: "Calzado y accesorios" },
  { id: "gorras", label: "Gorras", group: "Calzado y accesorios", image: "/img/adan/gorras.jpg" },
  { id: "accesorios", label: "Accesorios", group: "Calzado y accesorios" },
];

export const categoryGroups = [...new Set(categories.map((c) => c.group))];

// Categorías con al menos una prenda visible, en el orden de arriba, con la foto de su primera prenda.
export function shopCategories(products: Product[]) {
  return categories.flatMap((c) => {
    const first = products.find((p) => p.category === c.id && p.image);
    const has = first || products.some((p) => p.category === c.id);
    if (!has) return [];
    return [{ ...c, image: first?.image ?? c.image ?? "/img/adan/outfit-urbano.jpg" }];
  });
}

export function sizesOf(p: Product) {
  return p.sizes;
}

// Clave del stock. Sin color es solo el talle, así las prendas de un solo color quedan como antes.
export function stockKey(color: string, size: Size) {
  return color ? `${color}|${size}` : size;
}

export function stockOf(p: Product, size: Size, color = "") {
  return p.stock[stockKey(color, size)] ?? 0;
}

// Stock de un talle sumando todos los colores (para el filtro del catálogo y la tarjeta).
export function sizeStock(p: Product, size: Size) {
  return p.colors.length ? p.colors.reduce((sum, c) => sum + stockOf(p, size, c.name), 0) : stockOf(p, size);
}

export function colorStock(p: Product, color: string) {
  return p.sizes.reduce((sum, s) => sum + stockOf(p, s, color), 0);
}

export function totalStock(p: Product) {
  return Object.values(p.stock).reduce((sum, n) => sum + n, 0);
}

// Fotos de un color, o las generales si el color no tiene propias.
export function imagesOf(p: Product, color = "") {
  const own = p.colors.find((c) => c.name === color)?.images ?? [];
  return own.length ? own : p.images;
}

// Lee el campo `colors` de la base (JSON) sin confiar en su forma.
export function parseColors(raw: unknown): ProductColor[] {
  if (!Array.isArray(raw)) return [];
  return raw.flatMap((c) =>
    c && typeof c.name === "string" && c.name.trim()
      ? [{ name: c.name.trim(), hex: typeof c.hex === "string" ? c.hex : "#888888", images: Array.isArray(c.images) ? c.images.filter((x: unknown) => typeof x === "string") : [] }]
      : [],
  );
}
