import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { ArrowLeft } from "@phosphor-icons/react/dist/ssr";
import { getProduct, products, sizesOf, SIZES } from "@/lib/products";
import { formatPrice, store } from "@/lib/config";
import { ProductActions } from "@/components/product-actions";
import { ProductCard } from "@/components/product-card";

export function generateStaticParams() {
  return products.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const p = getProduct((await params).slug);
  return { title: p ? `${p.name} | ${store.name}` : store.name };
}

export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const product = getProduct((await params).slug);
  if (!product) notFound();

  const related = products
    .filter((p) => p.category === product.category && p.id !== product.id)
    .concat(products.filter((p) => p.category !== product.category))
    .slice(0, 4);

  return (
    <main>
      <div className="mx-auto max-w-7xl px-4 pt-6 md:px-8">
        <Link href="/#ropa" className="inline-flex h-11 items-center gap-2 text-sm text-muted hover:text-ink">
          <ArrowLeft size={16} /> Volver a la ropa
        </Link>
      </div>

      <section className="mx-auto grid max-w-7xl gap-8 px-4 pb-20 md:grid-cols-12 md:gap-12 md:px-8">
        <div className="relative aspect-[4/5] overflow-hidden bg-line md:col-span-7">
          <Image
            src={product.image}
            alt={`${product.name}, color ${product.color.toLowerCase()}`}
            fill
            priority
            sizes="(min-width: 768px) 58vw, 100vw"
            className="object-cover"
          />
        </div>

        <div className="md:col-span-5 md:pt-4">
          <p className="text-sm text-muted">
            {product.id} · {product.color}
          </p>
          <h1 className="mt-2 font-display text-5xl leading-[1] uppercase md:text-6xl">{product.name}</h1>
          <p className="mt-4 text-2xl font-semibold tabular-nums">{formatPrice(product.price)}</p>
          <p className="mt-6 max-w-[48ch] leading-relaxed text-muted">{product.description}</p>

          <ProductActions product={product} />

          <div className="mt-10 divide-y divide-line border-y border-line">
            {sizesOf(product).every((t) => (SIZES as readonly string[]).includes(t)) && (
            <details className="group py-4">
              <summary className="flex cursor-pointer list-none items-center justify-between font-semibold">
                Guía de talles
                <span className="text-xl transition-transform group-open:rotate-45">+</span>
              </summary>
              <div className="mt-4 grid grid-cols-5 gap-y-2 text-sm tabular-nums">
                <span className="text-muted">Talle</span>
                <span>S</span>
                <span>M</span>
                <span>L</span>
                <span>XL</span>
                <span className="text-muted">Pecho</span>
                <span>52 cm</span>
                <span>55 cm</span>
                <span>58 cm</span>
                <span>61 cm</span>
                <span className="text-muted">Largo</span>
                <span>70 cm</span>
                <span>72 cm</span>
                <span>74 cm</span>
                <span>76 cm</span>
              </div>
              <p className="mt-3 text-xs text-muted">Medidas de ejemplo. Prenda medida en plano.</p>
            </details>
            )}
            <details className="group py-4">
              <summary className="flex cursor-pointer list-none items-center justify-between font-semibold">
                Envíos y cambios
                <span className="text-xl transition-transform group-open:rotate-45">+</span>
              </summary>
              <p className="mt-3 text-sm leading-relaxed text-muted">
                {store.shippingNote} Envío gratis desde {formatPrice(store.freeShippingFrom)}. Tenés 30
                días para cambiar talle o prenda.
              </p>
            </details>
          </div>
        </div>
      </section>

      <section className="border-t border-line bg-surface">
        <div className="mx-auto max-w-7xl px-4 py-16 md:px-8">
          <h2 className="font-display text-3xl uppercase md:text-4xl">También te puede gustar</h2>
          <ul className="mt-8 grid grid-cols-2 gap-x-4 gap-y-10 lg:grid-cols-4">
            {related.map((p) => (
              <li key={p.id}>
                <ProductCard product={p} />
              </li>
            ))}
          </ul>
        </div>
      </section>
    </main>
  );
}
