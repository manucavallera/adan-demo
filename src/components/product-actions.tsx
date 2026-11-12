"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { HandbagSimple, WhatsappLogo } from "@phosphor-icons/react";
import { sizesOf, stockOf, type Product, type Size } from "@/lib/products";
import { useProductColor } from "./product-color";
import { formatPrice, store } from "@/lib/config";
import { WaLink } from "./wa-link";
import { useCart } from "./cart";

// Los dos botones de la ficha: comprar en la web o consultar por WhatsApp.
export function ProductActions({ product }: { product: Product }) {
  const { add } = useCart();
  const [size, setSize] = useState<Size | null>(null);
  const [error, setError] = useState(false);
  const { color } = useProductColor();

  // Si cambia el color y el talle elegido no tiene stock en ese color, se deselecciona.
  useEffect(() => {
    setSize((s) => (s && stockOf(product, s, color) > 0 ? s : null));
  }, [color, product]);

  const left = size ? stockOf(product, size, color) : null;
  const inColor = color ? ` color ${color.toLowerCase()}` : "";

  const waMessage = size
    ? `Hola ${store.name}! Quiero ${product.name} (${product.id})${inColor} en talle ${size}. ¿Está disponible?`
    : `Hola ${store.name}! Quiero consultar por ${product.name} (${product.id})${inColor}.`;

  function buy() {
    if (!size) {
      setError(true);
      return;
    }
    add(product.id, size, color);
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
              key={`${color}-${size}`}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="text-sm font-medium text-accent"
            >
              {left === 1 ? "Queda 1" : `Quedan ${left}`}{color ? ` en ${color.toLowerCase()}` : ""} talle {size}
            </motion.p>
          )}
        </AnimatePresence>
      </div>

      <div role="radiogroup" aria-labelledby="talle-label" className="mt-3 grid grid-cols-4 gap-2">
        {sizesOf(product).map((s) => {
          const out = stockOf(product, s, color) === 0;
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
      <WaLink
        message={`Hola! Quiero ${product.name} (${product.id}) pero no sé qué talle soy.`}
        className="mt-1 inline-flex min-h-11 items-center text-sm font-medium underline underline-offset-4 hover:text-accent"
      >
        ¿No sabés tu talle? Te lo decimos por WhatsApp
      </WaLink>
      {error && (
        <p role="alert" className="mt-2 text-sm font-medium text-accent">
          Elegí un talle para seguir.
        </p>
      )}

      {/* En celu queda fija abajo; en compu va en la ficha. */}
      <div
        data-buy-bar
        className="fixed inset-x-0 bottom-0 z-20 flex gap-2 border-t border-line bg-canvas/95 px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur md:static md:mt-6 md:flex-col md:gap-3 md:border-0 md:bg-transparent md:p-0 md:backdrop-blur-none"
      >
        <button
          type="button"
          onClick={buy}
          className="flex h-13 flex-1 cursor-pointer items-center justify-center gap-2 bg-accent font-semibold text-on-accent transition-transform hover:-translate-y-0.5 active:scale-[0.98] md:flex-none"
        >
          <HandbagSimple size={20} weight="bold" />
          Comprar<span className="hidden md:inline"> ahora</span>
          <span className="font-normal opacity-80 md:hidden">· {formatPrice(product.price)}</span>
        </button>
        <WaLink
          message={waMessage}
          className="flex h-13 w-13 shrink-0 items-center justify-center gap-2 border border-ink font-semibold transition-transform hover:-translate-y-0.5 active:scale-[0.98] md:w-auto"
        >
          <WhatsappLogo size={22} weight="fill" />
          <span className="sr-only md:not-sr-only">Consultar por WhatsApp</span>
        </WaLink>
      </div>
    </div>
  );
}
