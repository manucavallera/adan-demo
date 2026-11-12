"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/admin-auth";
import { prisma } from "@/lib/db";
import { categories, stockKey, type ProductColor } from "@/lib/products";
import { revalidateShop } from "@/lib/shop";
import { deleteImage } from "@/lib/uploads";

export type ProductInput = {
  id: string;
  isNewProduct: boolean;
  name: string;
  category: string;
  price: number;
  color: string;
  description: string;
  images: string[]; // fotos generales (prenda de un solo color)
  isNew: boolean;
  active: boolean;
  colors: ProductColor[]; // vacío = un solo color
  sizes: string[];
  stock: Record<string, number>; // clave: stockKey(color, talle)
};

function slugify(s: string) {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

async function uniqueSlug(base: string, id: string) {
  let slug = base || "prenda";
  for (let i = 2; ; i++) {
    const found = await prisma.product.findUnique({ where: { slug } });
    if (!found || found.id === id) return slug;
    slug = `${base}-${i}`;
  }
}

function changed() {
  revalidateShop();
  revalidatePath("/admin", "layout");
}

export async function saveProduct(input: ProductInput): Promise<{ error?: string }> {
  await requireAdmin();
  const id = input.id.trim().toUpperCase();
  const name = input.name.trim();
  const sizes = input.sizes.map((s) => s.trim()).filter(Boolean);
  const colors = input.colors
    .map((c) => ({ name: c.name.trim(), hex: /^#[0-9a-f]{6}$/i.test(c.hex) ? c.hex : "#888888", images: c.images.slice(0, 8) }))
    .filter((c) => c.name);
  const colorNames = colors.length ? colors.map((c) => c.name) : [""];
  const variants = colorNames.flatMap((color) =>
    sizes.map((size) => ({ color, size, stock: Math.max(0, Math.floor(input.stock[stockKey(color, size)] ?? 0) || 0) })),
  );

  if (!/^[A-Z0-9-]{2,20}$/.test(id)) return { error: "El código solo puede tener letras, números y guiones (ej: REM-004)." };
  if (name.length < 2) return { error: "Falta el nombre." };
  if (!categories.some((c) => c.id === input.category)) return { error: "Elegí una categoría." };
  if (!(input.price > 0)) return { error: "El precio tiene que ser mayor a 0." };
  if (sizes.length === 0) return { error: "Cargá al menos un talle." };
  if (new Set(sizes.map((s) => s.toLowerCase())).size !== sizes.length) return { error: "Hay talles repetidos." };
  if (input.colors.length > 0 && colors.length === 0) return { error: "Poné el nombre de cada color." };
  if (new Set(colors.map((c) => c.name.toLowerCase())).size !== colors.length) return { error: "Hay colores repetidos." };
  if (colors.some((c) => c.name.length > 30)) return { error: "El nombre del color es muy largo (hasta 30 letras)." };

  // Con varios colores, las fotos de la prenda son las de cada color, en orden (la primera es la de portada).
  const images = colors.length ? [...new Set(colors.flatMap((c) => c.images))].slice(0, 40) : input.images.slice(0, 8);

  const data = {
    name,
    category: input.category,
    price: Math.round(input.price),
    color: colors.length ? "" : input.color.trim(),
    colors,
    description: input.description.trim(),
    images,
    isNew: input.isNew,
    active: input.active,
  };

  if (input.isNewProduct) {
    if (await prisma.product.findUnique({ where: { id } })) return { error: `Ya existe una prenda con el código ${id}.` };
    const last = await prisma.product.aggregate({ _max: { sort: true } });
    await prisma.product.create({
      data: {
        id,
        slug: await uniqueSlug(slugify(name), id),
        sort: (last._max.sort ?? 0) + 1,
        ...data,
        variants: { create: variants.map((v, i) => ({ ...v, sort: i })) },
      },
    });
  } else {
    const before = await prisma.product.findUnique({ where: { id }, include: { variants: true } });
    if (!before) return { error: "La prenda no existe." };
    const keep = new Set(variants.map((v) => stockKey(v.color, v.size)));
    const gone = before.variants.filter((v) => !keep.has(stockKey(v.color, v.size))).map((v) => v.id);
    await prisma.$transaction([
      prisma.product.update({ where: { id }, data: { ...data, slug: await uniqueSlug(slugify(name), id) } }),
      prisma.variant.deleteMany({ where: { id: { in: gone } } }),
      ...variants.map((v, i) =>
        prisma.variant.upsert({
          where: { productId_color_size: { productId: id, color: v.color, size: v.size } },
          update: { stock: v.stock, sort: i },
          create: { productId: id, color: v.color, size: v.size, stock: v.stock, sort: i },
        }),
      ),
    ]);
    // Borra del disco las fotos que se sacaron.
    await Promise.all(before.images.filter((src) => !data.images.includes(src)).map(deleteImage));
  }

  changed();
  redirect("/admin/productos?ok=1");
}

export async function deleteProduct(id: string) {
  await requireAdmin();
  const p = await prisma.product.delete({ where: { id } }).catch(() => null);
  if (p) await Promise.all(p.images.map(deleteImage));
  changed();
  redirect("/admin/productos");
}

// Botones + y − de la lista: suma o resta stock de un talle.
export async function adjustStock(variantId: number, delta: number) {
  await requireAdmin();
  const v = await prisma.variant.findUnique({ where: { id: variantId } });
  if (!v) return;
  await prisma.variant.update({ where: { id: variantId }, data: { stock: Math.max(0, v.stock + delta) } });
  changed();
}

export async function setActive(id: string, active: boolean) {
  await requireAdmin();
  await prisma.product.update({ where: { id }, data: { active } });
  changed();
}
