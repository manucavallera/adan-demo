"use client";

import Image from "next/image";
import { createContext, useContext, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { colorStock, imagesOf, type Product } from "@/lib/products";

// Color elegido en la ficha. Lo comparten la galería y los botones de compra.
const ColorContext = createContext<{ color: string; setColor: (c: string) => void }>({ color: "", setColor: () => {} });

export function ProductColorProvider({ product, children }: { product: Product; children: React.ReactNode }) {
  // Arranca en el primer color con stock (o el primero si están todos agotados).
  const first = product.colors.find((c) => colorStock(product, c.name) > 0) ?? product.colors[0];
  const [color, setColor] = useState(first?.name ?? "");
  return <ColorContext.Provider value={{ color, setColor }}>{children}</ColorContext.Provider>;
}

export const useProductColor = () => useContext(ColorContext);

export function ProductGallery({ product }: { product: Product }) {
  const { color } = useProductColor();
  const images = imagesOf(product, color);
  const main = images[0] ?? product.image;
  const alt = `${product.name}${color ? `, color ${color.toLowerCase()}` : product.color ? `, color ${product.color.toLowerCase()}` : ""}`;
  return (
    <>
      <div className="relative aspect-[4/5] overflow-hidden bg-line md:col-span-7">
        <AnimatePresence initial={false}>
          <motion.div key={main} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.25 }} className="absolute inset-0">
            <Image src={main} alt={alt} fill priority sizes="(min-width: 768px) 58vw, 100vw" className="object-cover" />
          </motion.div>
        </AnimatePresence>
      </div>
      {images.length > 1 && (
        <div className="grid grid-cols-3 gap-3 md:col-span-7 md:row-start-2">
          {images.slice(1).map((src, i) => (
            <div key={src} className="relative aspect-[4/5] overflow-hidden bg-line">
              <Image src={src} alt={`${alt}, foto ${i + 2}`} fill sizes="(min-width: 768px) 19vw, 33vw" className="object-cover" />
            </div>
          ))}
        </div>
      )}
    </>
  );
}

// Circulitos de color. Un color agotado se ve tachado pero se puede tocar para ver las fotos.
export function ColorPicker({ product }: { product: Product }) {
  const { color, setColor } = useProductColor();
  if (product.colors.length === 0) return null;
  return (
    <div className="mt-8">
      <p id="color-label" className="font-semibold">
        Color: <span className="font-normal text-muted">{color}</span>
      </p>
      <div role="radiogroup" aria-labelledby="color-label" className="mt-3 flex flex-wrap gap-3">
        {product.colors.map((c) => {
          const on = c.name === color;
          const out = colorStock(product, c.name) === 0;
          return (
            <button
              key={c.name}
              type="button"
              role="radio"
              aria-checked={on}
              aria-label={`${c.name}${out ? " (agotado)" : ""}`}
              title={c.name}
              onClick={() => setColor(c.name)}
              className={`relative size-11 cursor-pointer rounded-full p-1 transition-shadow ${on ? "ring-2 ring-ink" : "ring-1 ring-line hover:ring-ink"}`}
            >
              <span className="block size-full rounded-full border border-ink/10" style={{ background: c.hex }} />
              {out && <span aria-hidden className="absolute inset-0 m-auto h-px w-full rotate-45 bg-ink/70" />}
            </button>
          );
        })}
      </div>
    </div>
  );
}
