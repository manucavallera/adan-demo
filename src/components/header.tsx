"use client";

import Link from "next/link";
import { motion, AnimatePresence } from "motion/react";
import { HandbagSimple } from "@phosphor-icons/react";
import { useCart } from "./cart";
import { categories } from "@/lib/products";
import { store } from "@/lib/config";

export function Header() {
  const { count, setOpen } = useCart();

  return (
    <header className="sticky top-0 z-30 border-b border-line bg-canvas/90 backdrop-blur-md">
      <p className="bg-ink px-4 py-2 text-center text-xs font-medium text-canvas">
        Demo de tienda. Los pagos están simulados.
      </p>
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-6 px-4 md:px-8">
        <Link href="/" className="font-display text-3xl tracking-wide uppercase">
          {store.name}
        </Link>

        <nav aria-label="Categorías" className="hidden items-center gap-8 md:flex">
          {categories.map((c) => (
            <Link
              key={c.id}
              href={`/?cat=${c.id}#ropa`}
              className="text-sm font-medium text-muted transition-colors hover:text-ink"
            >
              {c.label}
            </Link>
          ))}
        </nav>

        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label={`Abrir carrito, ${count} productos`}
          className="relative flex h-11 w-11 cursor-pointer items-center justify-center transition-transform active:scale-95"
        >
          <HandbagSimple size={26} weight="regular" />
          <AnimatePresence>
            {count > 0 && (
              <motion.span
                key={count}
                initial={{ scale: 0.4, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.4, opacity: 0 }}
                transition={{ type: "spring", stiffness: 500, damping: 22 }}
                className="absolute top-0.5 right-0.5 flex h-5 min-w-5 items-center justify-center bg-accent px-1 text-[11px] font-bold text-on-accent"
              >
                {count}
              </motion.span>
            )}
          </AnimatePresence>
        </button>
      </div>
    </header>
  );
}
