"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Minus, Plus, X, WhatsappLogo } from "@phosphor-icons/react";
import { useCart, cartToWhatsApp, lineLabel } from "./cart";
import { imagesOf, stockOf } from "@/lib/products";
import { formatPrice } from "@/lib/config";
import { useShop } from "./shop";
import { WaLink } from "./wa-link";

export function CartDrawer() {
  const { lines, open, setOpen, setQty, subtotal, shipping } = useCart();
  const { products, settings } = useShop();

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, setOpen]);

  const missing = settings.freeShippingFrom > 0 ? settings.freeShippingFrom - subtotal : 0;

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            className="fixed inset-0 z-40 bg-ink/40"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setOpen(false)}
          />
          <motion.aside
            role="dialog"
            aria-modal="true"
            aria-label="Carrito"
            className="fixed top-0 right-0 z-50 flex h-[100dvh] w-full max-w-md flex-col bg-surface"
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", stiffness: 320, damping: 34 }}
          >
            <div className="flex items-center justify-between border-b border-line px-5 py-4">
              <h2 className="font-display text-2xl uppercase">Tu carrito</h2>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Cerrar carrito"
                className="flex h-11 w-11 cursor-pointer items-center justify-center"
              >
                <X size={22} />
              </button>
            </div>

            {lines.length === 0 ? (
              <div className="flex flex-1 flex-col items-start justify-center gap-4 px-5">
                <p className="font-display text-3xl uppercase">Todavía no elegiste nada</p>
                <p className="text-muted">Elegí un talle en cualquier prenda y tocá “Comprar ahora”.</p>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="mt-2 cursor-pointer border border-ink px-5 py-3 text-sm font-semibold transition-transform active:scale-[0.98]"
                >
                  Ver la ropa
                </button>
              </div>
            ) : (
              <>
                <ul className="flex-1 divide-y divide-line overflow-y-auto px-5">
                  {lines.map((l) => {
                    const p = products.find((x) => x.id === l.id);
                    if (!p) return null;
                    return (
                      <li key={`${l.id}-${l.color ?? ""}-${l.size}`} className="flex gap-4 py-4">
                        <div className="relative h-24 w-20 shrink-0 overflow-hidden bg-line">
                          <Image src={imagesOf(p, l.color)[0] ?? p.image} alt={p.name} fill sizes="80px" className="object-cover" />
                        </div>
                        <div className="flex flex-1 flex-col">
                          <p className="font-semibold leading-tight">{p.name}</p>
                          <p className="text-sm text-muted first-letter:uppercase">{lineLabel(l)}</p>
                          <div className="mt-auto flex items-center justify-between">
                            <div className="flex items-center border border-line">
                              <button
                                type="button"
                                aria-label="Restar uno"
                                onClick={() => setQty(l.id, l.size, l.color ?? "", l.qty - 1)}
                                className="flex h-9 w-9 cursor-pointer items-center justify-center"
                              >
                                <Minus size={14} />
                              </button>
                              <span className="w-6 text-center text-sm tabular-nums">{l.qty}</span>
                              <button
                                type="button"
                                aria-label="Sumar uno"
                                disabled={l.qty >= stockOf(p, l.size, l.color)}
                                onClick={() => setQty(l.id, l.size, l.color ?? "", l.qty + 1)}
                                className="flex h-9 w-9 cursor-pointer items-center justify-center disabled:cursor-not-allowed disabled:opacity-30"
                              >
                                <Plus size={14} />
                              </button>
                            </div>
                            <p className="font-semibold tabular-nums">{formatPrice(p.price * l.qty)}</p>
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ul>

                <div className="space-y-3 border-t border-line px-5 py-5">
                  <p className="text-sm text-muted">
                    {missing > 0
                      ? `Te faltan ${formatPrice(missing)} para el envío gratis.`
                      : "Tenés envío gratis."}
                  </p>
                  <div className="flex justify-between text-lg font-semibold">
                    <span>Subtotal</span>
                    <span className="tabular-nums">{formatPrice(subtotal)}</span>
                  </div>
                  {shipping !== null && shipping > 0 && (
                    <p className="text-sm text-muted">Envío: {formatPrice(shipping)} (gratis si retirás)</p>
                  )}
                  {shipping === null && (
                    <p className="text-sm text-muted">El envío depende de tu zona. Lo elegís al finalizar la compra.</p>
                  )}
                  <Link
                    href="/checkout"
                    onClick={() => setOpen(false)}
                    className="flex h-13 items-center justify-center bg-accent font-semibold text-on-accent transition-transform active:scale-[0.98]"
                  >
                    Finalizar compra
                  </Link>
                  <WaLink
                    message={cartToWhatsApp(lines, products)}
                    className="flex h-13 items-center justify-center gap-2 border border-ink font-semibold transition-transform active:scale-[0.98]"
                  >
                    <WhatsappLogo size={20} weight="fill" />
                    Pedir por WhatsApp
                  </WaLink>
                </div>
              </>
            )}
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
