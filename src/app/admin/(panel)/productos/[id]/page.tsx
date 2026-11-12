import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { ProductForm } from "@/components/admin/product-form";
import { parseColors, stockKey } from "@/lib/products";

// /admin/productos/nuevo crea una prenda; /admin/productos/<código> la edita.
export default async function ProductEditPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const isNew = id === "nuevo";
  const product = isNew
    ? null
    : await prisma.product.findUnique({
        where: { id: decodeURIComponent(id) },
        include: { variants: { orderBy: [{ sort: "asc" }, { id: "asc" }] } },
      });
  if (!isNew && !product) notFound();

  const codes = isNew ? (await prisma.product.findMany({ select: { id: true } })).map((p) => p.id) : [];

  return (
    <>
      <Link href="/admin/productos" className="mb-4 inline-flex h-10 items-center text-sm text-muted hover:text-ink">
        ← Volver a productos
      </Link>
      <h1 className="mb-6 font-display text-4xl uppercase">{isNew ? "Nueva prenda" : product!.name}</h1>
      <ProductForm
        existingCodes={codes}
        initial={
          product
            ? {
                id: product.id,
                isNewProduct: false,
                name: product.name,
                category: product.category,
                price: product.price,
                oldPrice: product.oldPrice,
                color: product.color,
                description: product.description,
                images: product.images,
                isNew: product.isNew,
                active: product.active,
                colors: parseColors(product.colors),
                sizes: [...new Set(product.variants.map((v) => v.size))],
                stock: Object.fromEntries(product.variants.map((v) => [stockKey(v.color, v.size), v.stock])),
              }
            : null
        }
      />
    </>
  );
}
