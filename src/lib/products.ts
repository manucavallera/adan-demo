// Catálogo de la demo con las prendas reales de @adanindumentaria_ (fotos de su Instagram).
// Precios y stock son de ejemplo hasta que el dueño pase los reales. En la versión final
// esto sale de la base de datos y lo carga él desde el panel. El bot lee los mismos datos.

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
  image: string;
  color: string;
  description: string;
  stock: Record<Size, number>; // en el orden en que se muestran los talles
  isNew?: boolean;
};

export const categories: { id: Category; label: string; image: string }[] = [
  { id: "remeras", label: "Remeras", image: "/img/adan/remera-box-logo.jpg" },
  { id: "pantalones", label: "Pantalones", image: "/img/adan/pantalon-vestir.jpg" },
  { id: "bermudas", label: "Bermudas", image: "/img/adan/bermuda-surf.jpg" },
  { id: "camperas", label: "Camperas", image: "/img/adan/campera-rompeviento.jpg" },
  { id: "gorras", label: "Gorras", image: "/img/adan/gorras.jpg" },
];

export const products: Product[] = [
  {
    id: "REM-001",
    slug: "remera-box-logo",
    name: "Remera Box Logo",
    category: "remeras",
    price: 34900,
    image: "/img/adan/remera-box-logo.jpg",
    color: "Negro, gris o azul marino",
    description: "Algodón peinado con logo estampado al frente. También en versión musculosa negra.",
    stock: { S: 3, M: 5, L: 4, XL: 2 },
    isNew: true,
  },
  {
    id: "REM-002",
    slug: "remera-deportiva-dry-fit",
    name: "Remera Deportiva Dry Fit",
    category: "remeras",
    price: 29900,
    image: "/img/adan/remera-dry-fit.jpg",
    color: "Negro, gris o azul",
    description: "Tela liviana que seca rápido, con detalles reflectivos. Para entrenar o para todos los días.",
    stock: { S: 2, M: 6, L: 4, XL: 0 },
  },
  {
    id: "REM-003",
    slug: "remera-oversize-lavada",
    name: "Remera Oversize Lavada",
    category: "remeras",
    price: 36900,
    image: "/img/adan/outfit-urbano.jpg",
    color: "Verde lavado",
    description: "Corte oversize, algodón pesado con lavado vintage. Queda bien con una bermuda de jean.",
    stock: { S: 0, M: 3, L: 3, XL: 1 },
    isNew: true,
  },
  {
    id: "PAN-001",
    slug: "pantalon-de-vestir-sastrero",
    name: "Pantalón de Vestir Sastrero",
    category: "pantalones",
    price: 64900,
    image: "/img/adan/pantalon-vestir.jpg",
    color: "Negro o azul marino",
    description: "Tela sastrera con elastano, corte recto. Para la oficina, un evento o un casamiento.",
    stock: { "42": 1, "44": 3, "46": 2, "48": 1 },
    isNew: true,
  },
  {
    id: "PAN-002",
    slug: "pantalon-de-lino-beige",
    name: "Pantalón de Lino Beige",
    category: "pantalones",
    price: 59900,
    image: "/img/adan/pantalon-lino.jpg",
    color: "Beige",
    description: "Lino fresco con cintura elastizada y cordón. Estilo y comodidad en una sola prenda.",
    stock: { S: 1, M: 3, L: 2, XL: 1 },
  },
  {
    id: "BER-001",
    slug: "bermuda-surf-negra",
    name: "Bermuda Surf Negra",
    category: "bermudas",
    price: 39900,
    image: "/img/adan/bermuda-surf.jpg",
    color: "Negro",
    description: "Secado rápido, cierre con cordón al frente. Sirve para el río y para la calle.",
    stock: { "38": 2, "40": 3, "42": 2, "44": 0 },
  },
  {
    id: "CAM-001",
    slug: "campera-rompeviento",
    name: "Campera Rompeviento",
    category: "camperas",
    price: 69900,
    image: "/img/adan/campera-rompeviento.jpg",
    color: "Crudo y negro",
    description: "Rompeviento liviano con cierre, puños elastizados y bolsillos. Ideal para entretiempo.",
    stock: { S: 1, M: 2, L: 2, XL: 1 },
    isNew: true,
  },
  {
    id: "GOR-001",
    slug: "gorra-curva",
    name: "Gorra Curva",
    category: "gorras",
    price: 24900,
    image: "/img/adan/gorras.jpg",
    color: "Negro, azul, verde, beige o crudo",
    description: "Visera curva con logo bordado y ajuste atrás. Varios colores, consultá cuál querés.",
    stock: { Único: 12 },
  },
];

export function getProduct(slug: string) {
  return products.find((p) => p.slug === slug);
}

export function sizesOf(p: Product) {
  return Object.keys(p.stock);
}

export function totalStock(p: Product) {
  return sizesOf(p).reduce((sum, s) => sum + p.stock[s], 0);
}
