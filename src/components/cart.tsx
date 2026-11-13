"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { MotionConfig } from "motion/react";
import { stockOf, type Product, type Size } from "@/lib/products";
import { shippingFor, store } from "@/lib/config";
import { useShop } from "./shop";

// `color` vacío = prenda de un solo color (los carritos guardados antes no lo traen).
export type CartLine = { id: string; color?: string; size: Size; qty: number };

const same = (l: CartLine, id: string, size: Size, color: string) => l.id === id && l.size === size && (l.color ?? "") === color;

type CartState = {
  lines: CartLine[];
  count: number;
  subtotal: number;
  shipping: number | null; // null = depende de la zona
  open: boolean;
  setOpen: (v: boolean) => void;
  add: (id: string, size: Size, color?: string) => void;
  setQty: (id: string, size: Size, color: string, qty: number) => void;
  clear: () => void;
};

const CartContext = createContext<CartState | null>(null);
const KEY = "adan-cart";

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [lines, setLines] = useState<CartLine[]>([]);
  const [open, setOpen] = useState(false);
  const { products, settings } = useShop();
  const productsRef = useRef(products);
  productsRef.current = products;

  // El carrito se guarda en el navegador para que no se pierda al recargar.
  useEffect(() => {
    try {
      const saved = localStorage.getItem(KEY);
      if (saved) setLines(JSON.parse(saved));
    } catch {}
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(lines));
    } catch {}
  }, [lines]);

  const maxFor = (id: string, size: Size, color: string) => {
    const p = productsRef.current.find((x) => x.id === id);
    return p ? stockOf(p, size, color) : 0;
  };

  const add = useCallback((id: string, size: Size, color = "") => {
    setLines((prev) => {
      const found = prev.find((l) => same(l, id, size, color));
      if (found) {
        return prev.map((l) =>
          l === found ? { ...l, qty: Math.min(l.qty + 1, maxFor(id, size, color)) } : l,
        );
      }
      return [...prev, { id, color, size, qty: 1 }];
    });
    setOpen(true);
  }, []);

  const setQty = useCallback((id: string, size: Size, color: string, qty: number) => {
    setLines((prev) =>
      qty <= 0
        ? prev.filter((l) => !same(l, id, size, color))
        : prev.map((l) =>
            same(l, id, size, color) ? { ...l, qty: Math.min(qty, maxFor(id, size, color)) } : l,
          ),
    );
  }, []);

  const clear = useCallback(() => setLines([]), []);

  const value = useMemo(() => {
    const count = lines.reduce((s, l) => s + l.qty, 0);
    const subtotal = lines.reduce(
      (s, l) => s + (products.find((p) => p.id === l.id)?.price ?? 0) * l.qty,
      0,
    );
    const shipping = shippingFor(subtotal, settings);
    return { lines, count, subtotal, shipping, open, setOpen, add, setQty, clear };
  }, [lines, open, add, setQty, clear, products, settings]);

  return (
    <MotionConfig reducedMotion="user">
      <CartContext.Provider value={value}>{children}</CartContext.Provider>
    </MotionConfig>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart debe usarse dentro de CartProvider");
  return ctx;
}

export function cartToWhatsApp(lines: CartLine[], products: Product[], extra?: string) {
  const items = lines
    .map((l) => {
      const p = products.find((x) => x.id === l.id);
      return p ? `- ${l.qty} x ${p.name} (${p.id}) ${lineLabel(l)}` : "";
    })
    .filter(Boolean)
    .join("\n");
  return `Hola ${store.name}! Quiero hacer este pedido:\n${items}${extra ? `\n\n${extra}` : ""}`;
}

// "Negro · talle M" o "talle M" si la prenda es de un solo color.
export function lineLabel(l: { color?: string; size: string }) {
  return l.color ? `${l.color} · talle ${l.size}` : `talle ${l.size}`;
}
