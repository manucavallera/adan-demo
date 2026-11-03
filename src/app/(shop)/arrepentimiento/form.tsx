"use client";

import { useState } from "react";
import { CheckCircle, CircleNotch } from "@phosphor-icons/react";

const field = "h-12 w-full border border-line bg-canvas px-3 text-ink";

export function WithdrawalForm() {
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [code, setCode] = useState("");

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSending(true);
    setError("");
    try {
      const res = await fetch("/api/arrepentimiento", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(Object.fromEntries(new FormData(e.currentTarget))),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "No pudimos enviar el pedido.");
      setCode(data.code);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No pudimos enviar el pedido.");
    } finally {
      setSending(false);
    }
  }

  if (code) {
    return (
      <div className="mt-8 border border-line bg-surface p-6 text-ink">
        <CheckCircle size={36} weight="fill" className="text-accent" />
        <p className="mt-3 text-lg font-semibold">Recibimos tu pedido de arrepentimiento.</p>
        <p className="mt-1 text-muted">
          Tu código de trámite es <strong className="text-ink">{code}</strong>. Guardalo. Te escribimos por WhatsApp
          para coordinar la devolución.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="mt-8 grid gap-5 text-ink">
      <label className="grid gap-1.5">
        <span className="text-sm font-semibold">Nombre y apellido</span>
        <input name="name" required minLength={3} maxLength={80} autoComplete="name" className={field} />
      </label>
      <label className="grid gap-1.5">
        <span className="text-sm font-semibold">WhatsApp</span>
        <input name="phone" required inputMode="tel" autoComplete="tel" maxLength={30} placeholder="Ej: 343 4123456" className={field} />
      </label>
      <label className="grid gap-1.5">
        <span className="text-sm font-semibold">Email (opcional)</span>
        <input name="email" type="email" maxLength={120} autoComplete="email" className={field} />
      </label>
      <label className="grid gap-1.5">
        <span className="text-sm font-semibold">Número de pedido (si lo tenés)</span>
        <input name="orderCode" maxLength={20} placeholder="Ej: AD-0012" className={field} />
      </label>
      <label className="grid gap-1.5">
        <span className="text-sm font-semibold">Qué querés devolver (opcional)</span>
        <textarea name="reason" maxLength={500} rows={3} className="w-full border border-line bg-canvas p-3 text-ink" />
      </label>
      {error && (
        <p role="alert" className="border border-accent p-3 text-sm font-medium text-accent">
          {error}
        </p>
      )}
      <button
        type="submit"
        disabled={sending}
        className="flex h-14 cursor-pointer items-center justify-center gap-2 bg-accent text-lg font-semibold text-on-accent disabled:cursor-wait disabled:opacity-80"
      >
        {sending && <CircleNotch size={20} className="animate-spin" />} Quiero arrepentirme de mi compra
      </button>
    </form>
  );
}
