"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { HandbagSimple, WhatsappLogo } from "@phosphor-icons/react";
import { sizesOf, type Product, type Size } from "@/lib/products";
import { store } from "@/lib/config";
import { WaLink } from "./wa-link";
import { useCart } from "./cart";

// Los dos botones de la ficha: comprar en la web o consultar por WhatsApp.
export function ProductActions({ product }: { product: Product }) {
  const { add } = useCart();
  const [size, setSize] = useState<Size | null>(null);
  const [error, setError] = useState(false);

  const left = size ? product.stock[size] : null;

  const waMessage = size
    ? `Hola ${store.name}! Quiero ${product.name} (${product.id}) en talle ${size}. ¿Está disponible?`
    : `Hola ${store.name}! Quiero consultar por ${product.name} (${product.id}).`;

  function buy() {
    if (!size) {
      setError(true);
      return;
    }
    add(product.id, size);
  }

  return (
    <div className="mt-8">
      <div className="flex items-baseline justify-between">
        <p id="talle-label" className="font-semibold">
          Talle
        </p>
        <AnimatePresence mode="wait">
          {left !== null && left > 0 && left <= 2 && (
            <motion.p
              key={size}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="text-sm font-medium text-accent"
            >
              {left === 1 ? "Queda 1 en este talle" : `Quedan ${left} en este talle`}
            </motion.p>
          )}
        </AnimatePresence>
      </div>

      <div role="radiogroup" aria-labelledby="talle-label" className="mt-3 grid grid-cols-4 gap-2">
        {sizesOf(product).map((s) => {
          const out = product.stock[s] === 0;
          const on = size === s;
          return (
            <button
              key={s}
              type="button"
              role="radio"
              aria-checked={on}
              disabled={out}
              onClick={() => {
                setSize(s);
                setError(false);
              }}
              className={`h-12 cursor-pointer border text-sm font-semibold transition-colors active:scale-[0.97] disabled:cursor-not-allowed disabled:text-muted disabled:line-through disabled:opacity-50 ${
                on ? "border-ink bg-ink text-canvas" : "border-line hover:border-ink"
              }`}
            >
              {s}
            </button>
          );
        })}
      </div>
      {error && (
        <p role="alert" className="mt-2 text-sm font-medium text-accent">
          Elegí un talle para seguir.
        </p>
      )}

      <div className="sticky bottom-0 z-10 -mx-4 mt-6 flex flex-col gap-3 border-t border-line bg-canvas/95 px-4 py-4 backdrop-blur md:static md:mx-0 md:border-0 md:bg-transparent md:p-0 md:backdrop-blur-none">
        <button
          type="button"
          onClick={buy}
          className="flex h-13 cursor-pointer items-center justify-center gap-2 bg-accent font-semibold text-on-accent transition-transform hover:-translate-y-0.5 active:scale-[0.98]"
        >
          <HandbagSimple size={20} weight="bold" />
          Comprar ahora
        </button>
        <WaLink
          message={waMessage}
          className="flex h-13 items-center justify-center gap-2 border border-ink font-semibold transition-transform hover:-translate-y-0.5 active:scale-[0.98]"
        >
          <WhatsappLogo size={20} weight="fill" />
          Consultar por WhatsApp
        </WaLink>
      </div>
    </div>
  );
}
