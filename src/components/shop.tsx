"use client";

// Catálogo y configuración de la tienda para los componentes del navegador.
// Los carga el layout desde la base de datos y los pasa acá.
import { createContext, useContext } from "react";
import type { Product } from "@/lib/products";
import type { Settings } from "@/lib/config";

type ShopData = { products: Product[]; settings: Settings };

const ShopContext = createContext<ShopData | null>(null);

export function ShopProvider({ value, children }: { value: ShopData; children: React.ReactNode }) {
  return <ShopContext.Provider value={value}>{children}</ShopContext.Provider>;
}

export function useShop() {
  const ctx = useContext(ShopContext);
  if (!ctx) throw new Error("useShop fuera de ShopProvider");
  return ctx;
}
