// Tipos y categorías del catálogo. Las prendas viven en la base de datos: las carga el dueño
// desde el panel (/admin) y las leen la web y el bot (ver src/lib/shop.ts).

export type Category = "remeras" | "pantalones" | "bermudas" | "camperas" | "gorras";

// Talles de letra, para el filtro del catálogo. Cada prenda define los suyos en `stock`
// (los pantalones de vestir van por número, las gorras son talle único).
export const SIZES = ["S", "M", "L", "XL"] as const;
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

export const categories: { id: Category; label: string; image: string }[] = [
  { id: "remeras", label: "Remeras", image: "/img/adan/remera-box-logo.jpg" },
  { id: "pantalones", label: "Pantalones", image: "/img/adan/pantalon-vestir.jpg" },
  { id: "bermudas", label: "Bermudas", image: "/img/adan/bermuda-surf.jpg" },
  { id: "camperas", label: "Camperas", image: "/img/adan/campera-rompeviento.jpg" },
  { id: "gorras", label: "Gorras", image: "/img/adan/gorras.jpg" },
];

export function sizesOf(p: Product) {
  return p.sizes;
}

export function totalStock(p: Product) {
  return p.sizes.reduce((sum, s) => sum + (p.stock[s] ?? 0), 0);
}
