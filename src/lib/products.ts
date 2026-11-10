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
  sizes: Size[]; // talles en el orden en que se muestran
  stock: Record<Size, number>;
  isNew?: boolean;
};

// Todas las categorías que el dueño puede elegir en el panel. La web muestra solo las que tienen
// prendas visibles (ver shopCategories). `image` es la foto de reserva si la categoría no tiene fotos.
export const categories: { id: Category; label: string; image?: string }[] = [
  { id: "remeras", label: "Remeras", image: "/img/adan/remera-box-logo.jpg" },
  { id: "camisas", label: "Camisas" },
  { id: "chombas", label: "Chombas" },
  { id: "buzos", label: "Buzos" },
  { id: "sweaters", label: "Sweaters" },
  { id: "camperas", label: "Camperas", image: "/img/adan/campera-rompeviento.jpg" },
  { id: "sacos", label: "Sacos y trajes" },
  { id: "pantalones", label: "Pantalones", image: "/img/adan/pantalon-vestir.jpg" },
  { id: "jeans", label: "Jeans" },
  { id: "bermudas", label: "Bermudas", image: "/img/adan/bermuda-surf.jpg" },
  { id: "mallas", label: "Mallas" },
  { id: "calzado", label: "Calzado" },
  { id: "gorras", label: "Gorras", image: "/img/adan/gorras.jpg" },
  { id: "accesorios", label: "Accesorios" },
];

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

export function totalStock(p: Product) {
  return p.sizes.reduce((sum, s) => sum + (p.stock[s] ?? 0), 0);
}
