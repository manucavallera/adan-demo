"use client";

import { useState, useTransition } from "react";
import { changeStatus, saveNotes } from "@/app/admin/(panel)/pedidos/actions";
import { STATUS_LABEL, btnGhost, input } from "./ui";

const NEXT: Record<string, string[]> = {
  PENDIENTE: ["PAGADO", "CANCELADO"],
  PAGADO: ["ENVIADO", "ENTREGADO", "CANCELADO"],
  ENVIADO: ["ENTREGADO"],
  ENTREGADO: [],
  CANCELADO: ["PENDIENTE"],
};

const ACTION_LABEL: Record<string, string> = {
  PAGADO: "Marcar pagado",
  ENVIADO: "Marcar enviado",
  ENTREGADO: "Marcar entregado",
  CANCELADO: "Cancelar pedido",
  PENDIENTE: "Reabrir pedido",
};

export function OrderControls({ id, status, notes }: { id: number; status: string; notes: string }) {
  const [pending, start] = useTransition();
  const [error, setError] = useState("");
  const [text, setText] = useState(notes);
  const [saved, setSaved] = useState(false);

  function go(next: string) {
    if (next === "CANCELADO" && !confirm("¿Cancelar el pedido? El stock vuelve a quedar disponible.")) return;
    setError("");
    start(async () => {
      const res = await changeStatus(id, next);
      if (res.error) setError(res.error);
    });
  }

  return (
    <div className="space-y-5 border border-line bg-surface p-5">
      <div>
        <h2 className="mb-1 font-semibold">Estado: {STATUS_LABEL[status]}</h2>
        {status === "PENDIENTE" && <p className="mb-3 text-sm text-muted">Cuando te llegue el pago, marcalo pagado. Las prendas ya están reservadas.</p>}
        <div className="flex flex-wrap gap-2">
          {NEXT[status].map((s) => (
            <button key={s} type="button" disabled={pending} onClick={() => go(s)} className={`${btnGhost} ${s === "CANCELADO" ? "text-danger hover:border-danger" : s === "PAGADO" ? "border-ok text-ok" : s === "ENVIADO" ? "border-info text-info" : ""}`}>
              {ACTION_LABEL[s]}
            </button>
          ))}
        </div>
        {error && <p role="alert" className="mt-3 text-sm font-medium text-danger">{error}</p>}
      </div>
      <div>
        <label htmlFor="notes" className="mb-1 block font-semibold">Notas internas</label>
        <textarea
          id="notes"
          rows={3}
          value={text}
          onChange={(e) => { setText(e.target.value); setSaved(false); }}
          onBlur={() => start(async () => { await saveNotes(id, text); setSaved(true); })}
          placeholder="Ej: lo retira el hermano el sábado"
          className={`${input} h-auto py-2`}
        />
        <p className="mt-1 text-xs text-muted">{saved ? "Guardado." : "Se guarda al salir del cuadro."}</p>
      </div>
    </div>
  );
}
