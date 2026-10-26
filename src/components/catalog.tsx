"use client";

import { useMemo, useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "motion/react";
import { categories, products, SIZES, type Category, type Size } from "@/lib/products";
import { ProductCard } from "./product-card";

const chip =
  "h-10 shrink-0 cursor-pointer border px-4 text-sm font-medium transition-colors active:scale-[0.98]";
const chipOn = "border-ink bg-ink text-canvas";
const chipOff = "border-line text-ink hover:border-ink";

export function Catalog() {
  const params = useSearchParams();
  const [cat, setCat] = useState<Category | "todo">("todo");
  const [size, setSize] = useState<Size | null>(null);

  // Los links del menú (/?cat=buzos) filtran directo.
  useEffect(() => {
    const c = params.get("cat");
    if (c && categories.some((x) => x.id === c)) setCat(c as Category);
  }, [params]);

  const list = useMemo(
    () =>
      products.filter(
        (p) => (cat === "todo" || p.category === cat) && (!size || p.stock[size] > 0),
      ),
    [cat, size],
  );

  return (
    <div>
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 md:mx-0 md:px-0">
          {[{ id: "todo" as const, label: "Todo" }, ...categories].map((c) => (
            <button
              key={c.id}
              type="button"
              aria-pressed={cat === c.id}
              onClick={() => setCat(c.id)}
              className={`${chip} ${cat === c.id ? chipOn : chipOff}`}
            >
              {c.label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted">Tu talle</span>
          {SIZES.map((s) => (
            <button
              key={s}
              type="button"
              aria-pressed={size === s}
              onClick={() => setSize(size === s ? null : s)}
              className={`${chip} w-11 px-0 ${size === s ? chipOn : chipOff}`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {list.length === 0 ? (
        <div className="mt-12 border border-dashed border-line px-6 py-16">
          <p className="font-display text-3xl uppercase">No hay stock con ese filtro</p>
          <p className="mt-2 text-muted">Probá otro talle o mirá todas las prendas.</p>
          <button
            type="button"
            onClick={() => {
              setCat("todo");
              setSize(null);
            }}
            className="mt-6 cursor-pointer border border-ink px-5 py-3 text-sm font-semibold"
          >
            Ver todo
          </button>
        </div>
      ) : (
        <motion.ul layout className="mt-8 grid grid-cols-2 gap-x-4 gap-y-10 sm:grid-cols-3 lg:grid-cols-4">
          <AnimatePresence mode="popLayout">
            {list.map((p, i) => (
              <motion.li
                key={p.id}
                layout
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.96 }}
                transition={{ duration: 0.35, delay: i * 0.03, ease: [0.16, 1, 0.3, 1] }}
              >
                <ProductCard product={p} priority={i < 2} />
              </motion.li>
            ))}
          </AnimatePresence>
        </motion.ul>
      )}
    </div>
  );
}
