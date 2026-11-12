"use client";

import { useOptimistic, useTransition } from "react";
import { Minus, Plus } from "@phosphor-icons/react";
import { adjustStock, setActive } from "@/app/admin/(panel)/productos/actions";

// Stock de un talle con botones + y −. Se actualiza al toque y se guarda en segundo plano.
export function StockStepper({ id, name, size, stock }: { id: number; name: string; size: string; stock: number }) {
  const [pending, start] = useTransition();
  const [value, setValue] = useOptimistic(stock);
  const change = (delta: number) =>
    start(async () => {
      setValue(Math.max(0, value + delta));
      await adjustStock(id, delta);
    });
  // Verde = hay stock, ámbar = queda 1, rojo = agotado.
  const tone = value === 0 ? "border-danger bg-danger-soft text-danger" : value === 1 ? "border-warn bg-warn-soft text-warn" : "border-line";
  return (
    <div className={`flex items-center border ${tone}`} aria-busy={pending}>
      <button type="button" onClick={() => change(-1)} disabled={value === 0} aria-label={`Restar uno a ${name} talle ${size}`} className="flex h-10 w-9 cursor-pointer items-center justify-center disabled:opacity-30">
        <Minus size={14} />
      </button>
      <span className="min-w-14 text-center text-sm tabular-nums">
        <span className="opacity-70">{size}</span> <strong>{value}</strong>
      </span>
      <button type="button" onClick={() => change(1)} aria-label={`Sumar uno a ${name} talle ${size}`} className="flex h-10 w-9 cursor-pointer items-center justify-center">
        <Plus size={14} />
      </button>
    </div>
  );
}

export function ActiveToggle({ id, active }: { id: string; active: boolean }) {
  const [pending, start] = useTransition();
  const [on, setOn] = useOptimistic(active);
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() =>
        start(async () => {
          setOn(!on);
          await setActive(id, !on);
        })
      }
      className={`h-9 cursor-pointer px-3 text-xs font-semibold ${on ? "bg-ok-soft text-ok" : "bg-line text-muted"}`}
    >
      {on ? "Visible" : "Pausada"}
    </button>
  );
}
