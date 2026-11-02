"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { CircleNotch, Lock, WhatsappLogo } from "@phosphor-icons/react";
import { useShop } from "@/components/shop";
import { useCart, cartToWhatsApp } from "@/components/cart";
import { formatPrice, shippingFor } from "@/lib/config";
import { WaLink } from "@/components/wa-link";

type Delivery = "envio" | "retiro";
type Payment = "mercadopago" | "transferencia" | "efectivo";
type Errors = Partial<Record<"name" | "phone" | "address" | "city" | "zip", string>>;

const input =
  "h-12 w-full border border-line bg-surface px-4 text-base text-ink outline-none transition-colors placeholder:text-muted focus:border-ink focus-visible:ring-2 focus-visible:ring-accent";

export default function CheckoutPage() {
  const router = useRouter();
  const { lines, subtotal, clear } = useCart();
  const { products, settings } = useShop();
  const [delivery, setDelivery] = useState<Delivery>("envio");
  const [payment, setPayment] = useState<Payment>("mercadopago");
  const [serverError, setServerError] = useState("");
  const [form, setForm] = useState({ name: "", phone: "", address: "", city: "", zip: "" });
  const [errors, setErrors] = useState<Errors>({});
  const [paying, setPaying] = useState(false);

  const shipping = delivery === "retiro" ? 0 : shippingFor(subtotal, settings);
  const discount =
    payment === "transferencia" && settings.transferDiscount > 0
      ? Math.round((subtotal * settings.transferDiscount) / 100)
      : 0;
  const total = subtotal - discount + shipping;

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm((f) => ({ ...f, [k]: e.target.value }));
    setErrors((er) => ({ ...er, [k]: undefined }));
  };

  function validate() {
    const e: Errors = {};
    if (form.name.trim().length < 3) e.name = "Escribí tu nombre y apellido.";
    if (form.phone.replace(/\D/g, "").length < 8) e.phone = "Revisá el número, te avisamos por acá.";
    if (delivery === "envio") {
      if (!form.address.trim()) e.address = "Falta la dirección.";
      if (!form.city.trim()) e.city = "Falta la ciudad.";
      if (!/^\d{4}$/.test(form.zip)) e.zip = "Son 4 números.";
    }
    setErrors(e);
    // Lleva el foco al primer campo con error para que no tenga que buscarlo.
    const first = Object.keys(e)[0];
    if (first) document.getElementById(first)?.focus();
    return !first;
  }

  // Guarda el pedido (el servidor recalcula precios y reserva el stock) y pasa a la página de gracias.
  async function pay(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    setPaying(true);
    setServerError("");
    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          delivery,
          payment,
          items: lines.map((l) => ({ id: l.id, size: l.size, qty: l.qty })),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "No pudimos guardar el pedido.");
      clear();
      router.push(`/gracias?pedido=${data.id}`);
    } catch (err) {
      setServerError(err instanceof Error ? err.message : "No pudimos guardar el pedido.");
      setPaying(false);
    }
  }

  const waExtra = [
    form.name && `Nombre: ${form.name}`,
    delivery === "retiro"
      ? "Entrega: retiro en el local"
      : form.address && `Envío a: ${form.address}, ${form.city} (${form.zip})`,
  ]
    .filter(Boolean)
    .join("\n");

  if (lines.length === 0) {
    return (
      <main className="mx-auto flex min-h-[60dvh] max-w-3xl flex-col justify-center px-4 py-20 md:px-8">
        <h1 className="font-display text-5xl uppercase">Tu carrito está vacío</h1>
        <p className="mt-3 text-muted">Elegí una prenda y tu talle para empezar.</p>
        <Link href="/#ropa" className="mt-8 inline-flex h-13 w-fit items-center bg-accent px-7 font-semibold text-on-accent">
          Ver la ropa
        </Link>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-7xl px-4 py-10 md:px-8 md:py-16">
      <h1 className="font-display text-5xl uppercase md:text-6xl">Finalizar compra</h1>

      <div className="mt-10 grid gap-12 lg:grid-cols-12">
        <form onSubmit={pay} noValidate className="space-y-10 lg:col-span-7">
          <fieldset className="space-y-5">
            <legend className="mb-5 text-xl font-semibold">Tus datos</legend>
            <Field id="name" label="Nombre y apellido" error={errors.name}>
              <input id="name" autoComplete="name" value={form.name} onChange={set("name")} className={input} aria-invalid={!!errors.name} aria-describedby="name-err" />
            </Field>
            <Field id="phone" label="WhatsApp" hint="Te avisamos el estado del pedido por acá." error={errors.phone}>
              <input id="phone" type="tel" inputMode="tel" autoComplete="tel" placeholder="351 123 4567" value={form.phone} onChange={set("phone")} className={input} aria-invalid={!!errors.phone} aria-describedby="phone-hint phone-err" />
            </Field>
          </fieldset>

          <fieldset>
            <legend className="mb-5 text-xl font-semibold">Entrega</legend>
            <div className="grid gap-3 sm:grid-cols-2">
              {(
                [
                  ["envio", "Envío a domicilio", shippingFor(subtotal, settings) === 0 ? "Gratis" : formatPrice(settings.shippingCost)],
                  ["retiro", "Retiro en el local", settings.address ? `Gratis, en ${settings.address}` : "Gratis"],
                ] as const
              ).map(([value, title, sub]) => (
                <label
                  key={value}
                  className={`flex cursor-pointer items-start gap-3 border p-4 transition-colors ${
                    delivery === value ? "border-ink" : "border-line hover:border-muted"
                  }`}
                >
                  <input
                    type="radio"
                    name="delivery"
                    value={value}
                    checked={delivery === value}
                    onChange={() => {
                      setDelivery(value);
                      // Efectivo solo si retira en el local.
                      if (value === "envio" && payment === "efectivo") setPayment("mercadopago");
                    }}
                    className="mt-1 accent-[var(--accent)]"
                  />
                  <span>
                    <span className="block font-semibold">{title}</span>
                    <span className="text-sm text-muted">{sub}</span>
                  </span>
                </label>
              ))}
            </div>

            {delivery === "envio" && (
              <div className="mt-6 grid gap-5 sm:grid-cols-6">
                <div className="sm:col-span-6">
                  <Field id="address" label="Calle y número" error={errors.address}>
                    <input id="address" autoComplete="street-address" value={form.address} onChange={set("address")} className={input} aria-invalid={!!errors.address} aria-describedby="address-err" />
                  </Field>
                </div>
                <div className="sm:col-span-4">
                  <Field id="city" label="Ciudad" error={errors.city}>
                    <input id="city" autoComplete="address-level2" value={form.city} onChange={set("city")} className={input} aria-invalid={!!errors.city} aria-describedby="city-err" />
                  </Field>
                </div>
                <div className="sm:col-span-2">
                  <Field id="zip" label="Código postal" error={errors.zip}>
                    <input id="zip" inputMode="numeric" autoComplete="postal-code" maxLength={4} value={form.zip} onChange={set("zip")} className={input} aria-invalid={!!errors.zip} aria-describedby="zip-err" />
                  </Field>
                </div>
              </div>
            )}
          </fieldset>

          <fieldset>
            <legend className="mb-5 text-xl font-semibold">Pago</legend>
            <div className="grid gap-3">
              {(
                [
                  ["mercadopago", "Mercado Pago", settings.installments || "Tarjeta, débito o dinero en cuenta"],
                  ["transferencia", "Transferencia", settings.transferDiscount > 0 ? `${settings.transferDiscount}% de descuento` : "Te pasamos los datos"],
                  ...(delivery === "retiro" ? [["efectivo", "Efectivo al retirar", "Pagás en el local"]] : []),
                ] as [Payment, string, string][]
              ).map(([value, title, sub]) => (
                <label
                  key={value}
                  className={`flex cursor-pointer items-start gap-3 border p-4 transition-colors ${
                    payment === value ? "border-ink" : "border-line hover:border-muted"
                  }`}
                >
                  <input
                    type="radio"
                    name="payment"
                    value={value}
                    checked={payment === value}
                    onChange={() => setPayment(value)}
                    className="mt-1 accent-[var(--accent)]"
                  />
                  <span>
                    <span className="block font-semibold">{title}</span>
                    <span className="text-sm text-muted">{sub}</span>
                  </span>
                </label>
              ))}
            </div>
          </fieldset>

          <div className="space-y-3">
            {serverError && (
              <p role="alert" className="border border-accent p-3 text-sm font-medium text-accent">
                {serverError}
              </p>
            )}
            <button
              type="submit"
              disabled={paying}
              className="flex h-14 w-full cursor-pointer items-center justify-center gap-2 bg-accent text-lg font-semibold text-on-accent transition-transform active:scale-[0.98] disabled:cursor-wait disabled:opacity-80"
            >
              {paying ? (
                <>
                  <CircleNotch size={20} className="animate-spin" /> Guardando tu pedido
                </>
              ) : (
                <>
                  <Lock size={18} weight="bold" /> Confirmar pedido · {formatPrice(total)}
                </>
              )}
            </button>
            <p className="text-center text-sm text-muted">Te reservamos las prendas y te escribimos por WhatsApp para coordinar.</p>
            <WaLink
              message={cartToWhatsApp(lines, products, waExtra)}
              className="flex h-13 w-full items-center justify-center gap-2 border border-ink font-semibold transition-transform active:scale-[0.98]"
            >
              <WhatsappLogo size={20} weight="fill" /> Prefiero pagar por WhatsApp
            </WaLink>
          </div>
        </form>

        <aside className="lg:col-span-5">
          <div className="border border-line bg-surface p-6 lg:sticky lg:top-32">
            <h2 className="text-xl font-semibold">Tu pedido</h2>
            <ul className="mt-5 space-y-4">
              {lines.map((l) => {
                const p = products.find((x) => x.id === l.id);
                if (!p) return null;
                return (
                  <li key={`${l.id}-${l.size}`} className="flex gap-4">
                    <div className="relative h-20 w-16 shrink-0 overflow-hidden bg-line">
                      <Image src={p.image} alt={p.name} fill sizes="64px" className="object-cover" />
                    </div>
                    <div className="flex flex-1 justify-between gap-3">
                      <div>
                        <p className="font-medium leading-tight">{p.name}</p>
                        <p className="text-sm text-muted">
                          Talle {l.size} · {l.qty} {l.qty === 1 ? "unidad" : "unidades"}
                        </p>
                      </div>
                      <p className="tabular-nums">{formatPrice(p.price * l.qty)}</p>
                    </div>
                  </li>
                );
              })}
            </ul>
            <dl className="mt-6 space-y-2 border-t border-line pt-5 text-sm">
              <div className="flex justify-between">
                <dt className="text-muted">Subtotal</dt>
                <dd className="tabular-nums">{formatPrice(subtotal)}</dd>
              </div>
              {discount > 0 && (
                <div className="flex justify-between">
                  <dt className="text-muted">Descuento transferencia</dt>
                  <dd className="tabular-nums">−{formatPrice(discount)}</dd>
                </div>
              )}
              <div className="flex justify-between">
                <dt className="text-muted">Envío</dt>
                <dd className="tabular-nums">{shipping === 0 ? "Gratis" : formatPrice(shipping)}</dd>
              </div>
              <div className="flex justify-between pt-2 text-lg font-semibold">
                <dt>Total</dt>
                <dd className="tabular-nums">{formatPrice(total)}</dd>
              </div>
            </dl>
          </div>
        </aside>
      </div>
    </main>
  );
}

function Field({
  id,
  label,
  hint,
  error,
  children,
}: {
  id: string;
  label: string;
  hint?: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={id} className="text-sm font-semibold">
        {label}
      </label>
      {children}
      {hint && (
        <p id={`${id}-hint`} className="text-sm text-muted">
          {hint}
        </p>
      )}
      <p id={`${id}-err`} role={error ? "alert" : undefined} className="text-sm font-medium text-accent empty:hidden">
        {error}
      </p>
    </div>
  );
}
