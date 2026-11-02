// Carga inicial: las prendas de la demo (fotos del Instagram de ADAN, precios y stock de ejemplo)
// y la configuración de la tienda. Solo corre la primera vez, así no pisa lo que cargó el dueño.
// Corre sola al arrancar el contenedor (docker-entrypoint.sh). A mano: node prisma/seed.mjs
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();


const products = [
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

async function main() {
  // Solo la primera vez: si ya hay ajustes guardados, la tienda ya arrancó y no se toca nada
  // (así no vuelven las prendas de ejemplo si el dueño las borra).
  if (await prisma.settings.findUnique({ where: { id: 1 } })) return;
  if ((await prisma.product.count()) === 0) {
    for (const [i, p] of products.entries()) {
      await prisma.product.create({
        data: {
          id: p.id,
          slug: p.slug,
          name: p.name,
          category: p.category,
          price: p.price,
          color: p.color,
          description: p.description,
          images: [p.image],
          isNew: p.isNew ?? false,
          sort: i,
          variants: { create: Object.entries(p.stock).map(([size, stock], j) => ({ size, stock, sort: j })) },
        },
      });
    }
    console.log(`Cargadas ${products.length} prendas`);
  }
  await prisma.settings.upsert({
    where: { id: 1 },
    update: {},
    create: {
      whatsapp: "",
      address: "Sarmiento 330",
      city: "Viale, Entre Ríos",
      hours: "",
      installments: "3 cuotas sin interés",
      shippingCost: 7500,
      freeShippingFrom: 150000,
      transferDiscount: 10,
    },
  });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
