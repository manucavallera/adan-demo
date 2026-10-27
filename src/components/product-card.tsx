import Image from "next/image";
import Link from "next/link";
import { sizesOf, totalStock, type Product } from "@/lib/products";
import { formatPrice } from "@/lib/config";

export function ProductCard({ product, priority }: { product: Product; priority?: boolean }) {
  const soldOut = totalStock(product) === 0;

  return (
    <Link href={`/producto/${product.slug}`} className="group block">
      <div className="relative aspect-[4/5] overflow-hidden bg-line">
        <Image
          src={product.image}
          alt={`${product.name}, color ${product.color.toLowerCase()}`}
          fill
          priority={priority}
          sizes="(min-width: 1024px) 25vw, (min-width: 640px) 33vw, 50vw"
          className="object-cover transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-[1.04]"
        />
        {product.isNew && (
          <span className="absolute top-2 left-2 bg-accent px-2 py-1 text-xs font-semibold tracking-wide text-on-accent uppercase">
            Nuevo
          </span>
        )}
      </div>
      <h3 className="mt-3 text-sm leading-snug font-semibold md:text-base">{product.name}</h3>
      <p className="mt-1 text-sm tabular-nums text-muted md:text-base">
        {soldOut ? "Agotado" : formatPrice(product.price)}
      </p>
      <p className="mt-2 flex gap-2 text-xs text-muted" aria-label="Talles disponibles">
        {sizesOf(product).map((s) => (
          <span key={s} className={product.stock[s] === 0 ? "line-through opacity-40" : ""}>
            {s}
          </span>
        ))}
      </p>
    </Link>
  );
}
