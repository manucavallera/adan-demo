"use client";

import { useState } from "react";
import { Plus, Trash } from "@phosphor-icons/react";
import type { ShippingZone } from "@/lib/config";
import { input } from "@/components/admin/ui";

type Row = { name: string; price: string; tbd: boolean };

const EXAMPLE: Row[] = [
  { name: "Viale", price: "", tbd: false },
  { name: "Paraná y alrededores", price: "", tbd: false },
  { name: "Resto del país", price: "", tbd: true },
];

// Zonas de envío. Se guardan como JSON en un input oculto que lee el formulario de Ajustes.
export function ZonesEditor({ initial }: { initial: ShippingZone[] }) {
  const [rows, setRows] = useState<Row[]>(
    initial.map((z) => ({ name: z.name, price: z.price === null ? "" : String(z.price), tbd: z.price === null })),
  );
  const set = (i: number, patch: Partial<Row>) => setRows((r) => r.map((x, j) => (j === i ? { ...x, ...patch } : x)));
  const value = JSON.stringify(
    rows.filter((r) => r.name.trim()).map((r) => ({ name: r.name.trim(), price: r.tbd ? null : Number(r.price) || 0 })),
  );

  return (
    <div className="grid gap-3 sm:col-span-2">
      <input type="hidden" name="shippingZones" value={value} />
      <div>
        <p className="text-sm font-semibold">Zonas de envío</p>
        <p className="text-sm text-muted">
          El cliente elige su zona al comprar. Si no cargás zonas, se cobra el costo de envío de arriba para todos.
          &quot;A coordinar&quot;: le pasás el precio por WhatsApp.
        </p>
      </div>
      {rows.map((r, i) => (
        <div key={i} className="flex flex-wrap items-center gap-2 border border-line p-3">
          <input
            aria-label={`Nombre de la zona ${i + 1}`}
            placeholder="Ej: Viale"
            value={r.name}
            maxLength={60}
            onChange={(e) => set(i, { name: e.target.value })}
            className={`${input} min-w-0 flex-1 basis-48`}
          />
          <input
            aria-label={`Precio de ${r.name || `la zona ${i + 1}`}`}
            type="number"
            min={0}
            placeholder="Precio"
            value={r.tbd ? "" : r.price}
            disabled={r.tbd}
            onChange={(e) => set(i, { price: e.target.value })}
            className={`${input.replace("w-full ", "")} w-32 disabled:opacity-50`}
          />
          <label className="flex cursor-pointer items-center gap-2 text-sm">
            <input type="checkbox" checked={r.tbd} onChange={(e) => set(i, { tbd: e.target.checked })} className="size-4 accent-[var(--accent)]" />
            A coordinar
          </label>
          <button
            type="button"
            onClick={() => setRows((x) => x.filter((_, j) => j !== i))}
            aria-label={`Borrar ${r.name || "zona"}`}
            className="ml-auto flex size-10 cursor-pointer items-center justify-center text-danger hover:bg-danger-soft"
          >
            <Trash size={18} />
          </button>
        </div>
      ))}
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setRows((x) => [...x, { name: "", price: "", tbd: false }])}
          className="flex h-11 cursor-pointer items-center gap-2 border border-ink px-4 text-sm font-semibold"
        >
          <Plus size={16} weight="bold" /> Agregar zona
        </button>
        {rows.length === 0 && (
          <button type="button" onClick={() => setRows(EXAMPLE)} className="h-11 cursor-pointer px-4 text-sm text-muted underline">
            Usar ejemplo (Viale, Paraná, resto del país)
          </button>
        )}
      </div>
    </div>
  );
}
