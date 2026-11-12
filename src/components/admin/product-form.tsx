"use client";

import Image from "next/image";
import { useState, useTransition } from "react";
import { ArrowLeft, ArrowRight, CircleNotch, Trash, UploadSimple } from "@phosphor-icons/react";
import { categories, categoryGroups } from "@/lib/products";
import { deleteProduct, saveProduct, type ProductInput } from "@/app/admin/(panel)/productos/actions";
import { Field, btnGhost, btnPrimary, input } from "./ui";

const PREFIX: Record<string, string> = {
  remeras: "REM",
  camisas: "CMS",
  chombas: "CHO",
  buzos: "BUZ",
  sweaters: "SWE",
  camperas: "CAM",
  sacos: "SAC",
  pantalones: "PAN",
  jeans: "JEA",
  bermudas: "BER",
  mallas: "MAL",
  calzado: "CAL",
  gorras: "GOR",
  accesorios: "ACC",
};

const PRESETS: { label: string; sizes: string[] }[] = [
  { label: "S a XL", sizes: ["S", "M", "L", "XL"] },
  { label: "S a XXL", sizes: ["S", "M", "L", "XL", "XXL"] },
  { label: "Pantalón 38 a 50", sizes: ["38", "40", "42", "44", "46", "48", "50"] },
  { label: "Bermuda 38 a 44", sizes: ["38", "40", "42", "44"] },
  { label: "Calzado 39 a 45", sizes: ["39", "40", "41", "42", "43", "44", "45"] },
  { label: "Talle único", sizes: ["Único"] },
];

function suggestCode(category: string, codes: string[]) {
  const prefix = PREFIX[category] ?? "PRD";
  const used = codes.filter((c) => c.startsWith(`${prefix}-`)).map((c) => Number(c.split("-")[1]) || 0);
  return `${prefix}-${String(Math.max(0, ...used) + 1).padStart(3, "0")}`;
}

export function ProductForm({ initial, existingCodes }: { initial: ProductInput | null; existingCodes: string[] }) {
  const [p, setP] = useState<ProductInput>(
    initial ?? {
      id: suggestCode("remeras", existingCodes),
      isNewProduct: true,
      name: "",
      category: "remeras",
      price: 0,
      color: "",
      description: "",
      images: [],
      isNew: true,
      active: true,
      variants: PRESETS[0].sizes.map((size) => ({ size, stock: 0 })),
    },
  );
  const [error, setError] = useState("");
  const [uploading, setUploading] = useState(0);
  const [saving, startSave] = useTransition();
  const [deleting, startDelete] = useTransition();

  const set = <K extends keyof ProductInput>(k: K, v: ProductInput[K]) => setP((x) => ({ ...x, [k]: v }));

  async function upload(files: FileList | null) {
    if (!files?.length) return;
    setError("");
    const list = [...files].slice(0, 8 - p.images.length);
    setUploading((n) => n + list.length);
    for (const file of list) {
      try {
        const body = new FormData();
        body.append("file", file);
        const res = await fetch("/api/admin/upload", { method: "POST", body });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        setP((x) => ({ ...x, images: [...x.images, data.src] }));
      } catch (e) {
        setError(e instanceof Error && e.message ? e.message : "No se pudo subir una foto.");
      } finally {
        setUploading((n) => n - 1);
      }
    }
  }

  function moveImage(i: number, dir: -1 | 1) {
    setP((x) => {
      const images = [...x.images];
      const j = i + dir;
      if (j < 0 || j >= images.length) return x;
      [images[i], images[j]] = [images[j], images[i]];
      return { ...x, images };
    });
  }

  function save(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    startSave(async () => {
      const res = await saveProduct(p);
      if (res?.error) setError(res.error);
    });
  }

  return (
    <form onSubmit={save} className="grid gap-8 lg:grid-cols-2">
      <div className="space-y-5">
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Categoría" htmlFor="category">
            <select
              id="category"
              value={p.category}
              onChange={(e) => {
                const category = e.target.value;
                setP((x) => ({ ...x, category, id: x.isNewProduct ? suggestCode(category, existingCodes) : x.id }));
              }}
              className={input}
            >
              {categoryGroups.map((g) => (
                <optgroup key={g} label={g}>
                  {categories
                    .filter((c) => c.group === g)
                    .map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.label}
                      </option>
                    ))}
                </optgroup>
              ))}
            </select>
          </Field>
          <Field label="Código" htmlFor="code" hint={p.isNewProduct ? "Lo usa el bot y aparece en los pedidos." : "El código no se puede cambiar."}>
            <input id="code" value={p.id} disabled={!p.isNewProduct} onChange={(e) => set("id", e.target.value.toUpperCase())} className={input} />
          </Field>
        </div>
        <Field label="Nombre" htmlFor="name">
          <input id="name" value={p.name} onChange={(e) => set("name", e.target.value)} required maxLength={80} className={input} placeholder="Remera Box Logo" />
        </Field>
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Precio" htmlFor="price" hint="En pesos, sin puntos.">
            <input id="price" type="number" inputMode="numeric" min={1} value={p.price || ""} onChange={(e) => set("price", Number(e.target.value))} required className={input} />
          </Field>
          <Field label="Colores" htmlFor="color" hint="Ej: Negro, gris o azul marino">
            <input id="color" value={p.color} onChange={(e) => set("color", e.target.value)} maxLength={120} className={input} />
          </Field>
        </div>
        <Field label="Descripción" htmlFor="description" hint="Tela, calce, para qué ocasión. El bot usa este texto para recomendar.">
          <textarea id="description" value={p.description} onChange={(e) => set("description", e.target.value)} rows={4} maxLength={600} className={`${input} h-auto py-2`} />
        </Field>
        <div className="flex flex-wrap gap-6">
          <label className="flex min-h-11 cursor-pointer items-center gap-2 text-sm">
            <input type="checkbox" checked={p.active} onChange={(e) => set("active", e.target.checked)} className="size-5 accent-[var(--accent)]" />
            Visible en la web y para el bot
          </label>
          <label className="flex min-h-11 cursor-pointer items-center gap-2 text-sm">
            <input type="checkbox" checked={p.isNew} onChange={(e) => set("isNew", e.target.checked)} className="size-5 accent-[var(--accent)]" />
            Marcar como nuevo
          </label>
        </div>
      </div>

      <div className="space-y-8">
        <section>
          <h2 className="mb-1 font-semibold">Fotos</h2>
          <p className="mb-3 text-xs text-muted">La primera es la principal. Hasta 8 fotos.</p>
          <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
            {p.images.map((src, i) => (
              <div key={src} className="group relative aspect-[4/5] overflow-hidden bg-line">
                <Image src={src} alt={`Foto ${i + 1}`} fill sizes="150px" className="object-cover" />
                {i === 0 && <span className="absolute top-1 left-1 bg-accent px-1.5 text-[10px] font-semibold text-on-accent">Principal</span>}
                <div className="absolute inset-x-0 bottom-0 flex justify-between bg-ink/70 text-canvas">
                  <button type="button" onClick={() => moveImage(i, -1)} disabled={i === 0} aria-label="Mover a la izquierda" className="flex h-8 flex-1 cursor-pointer items-center justify-center disabled:opacity-30">
                    <ArrowLeft size={14} />
                  </button>
                  <button type="button" onClick={() => set("images", p.images.filter((x) => x !== src))} aria-label="Sacar foto" className="flex h-8 flex-1 cursor-pointer items-center justify-center">
                    <Trash size={14} />
                  </button>
                  <button type="button" onClick={() => moveImage(i, 1)} disabled={i === p.images.length - 1} aria-label="Mover a la derecha" className="flex h-8 flex-1 cursor-pointer items-center justify-center disabled:opacity-30">
                    <ArrowRight size={14} />
                  </button>
                </div>
              </div>
            ))}
            {p.images.length < 8 && (
              <label className="flex aspect-[4/5] cursor-pointer flex-col items-center justify-center gap-1 border border-dashed border-muted text-center text-xs text-muted hover:border-ink">
                {uploading > 0 ? <CircleNotch size={22} className="animate-spin" /> : <UploadSimple size={22} />}
                {uploading > 0 ? "Subiendo..." : "Agregar fotos"}
                <input type="file" accept="image/*" multiple className="sr-only" onChange={(e) => { void upload(e.target.files); e.target.value = ""; }} />
              </label>
            )}
          </div>
        </section>

        <section>
          <h2 className="mb-1 font-semibold">Talles y stock</h2>
          <div className="mb-3 flex flex-wrap gap-2">
            {PRESETS.map((pr) => (
              <button
                key={pr.label}
                type="button"
                onClick={() => set("variants", pr.sizes.map((size) => ({ size, stock: p.variants.find((v) => v.size === size)?.stock ?? 0 })))}
                className="h-9 cursor-pointer border border-line px-3 text-xs hover:border-ink"
              >
                {pr.label}
              </button>
            ))}
          </div>
          <ul className="space-y-2">
            {p.variants.map((v, i) => (
              <li key={i} className="flex items-center gap-2">
                <input
                  aria-label="Talle"
                  value={v.size}
                  onChange={(e) => set("variants", p.variants.map((x, j) => (j === i ? { ...x, size: e.target.value } : x)))}
                  className={`${input} w-28`}
                  placeholder="Talle"
                  maxLength={12}
                />
                <input
                  aria-label={`Stock talle ${v.size}`}
                  type="number"
                  inputMode="numeric"
                  min={0}
                  value={v.stock}
                  onChange={(e) => set("variants", p.variants.map((x, j) => (j === i ? { ...x, stock: Number(e.target.value) } : x)))}
                  className={`${input} w-24`}
                />
                <span className="text-sm text-muted">unidades</span>
                <button type="button" onClick={() => set("variants", p.variants.filter((_, j) => j !== i))} aria-label={`Sacar talle ${v.size}`} className="ml-auto flex size-11 cursor-pointer items-center justify-center text-muted hover:text-accent">
                  <Trash size={18} />
                </button>
              </li>
            ))}
          </ul>
          <button type="button" onClick={() => set("variants", [...p.variants, { size: "", stock: 0 }])} className="mt-2 h-10 cursor-pointer text-sm font-semibold text-accent">
            + Agregar talle
          </button>
        </section>
      </div>

      <div className="flex flex-wrap items-center gap-3 border-t border-line pt-6 lg:col-span-2">
        {error && (
          <p role="alert" className="w-full border-l-4 border-danger bg-danger-soft p-3 text-sm font-medium text-danger">
            {error}
          </p>
        )}
        <button type="submit" disabled={saving || uploading > 0} className={btnPrimary}>
          {saving && <CircleNotch size={16} className="animate-spin" />} Guardar
        </button>
        {!p.isNewProduct && (
          <button
            type="button"
            disabled={deleting}
            onClick={() => {
              if (confirm(`¿Borrar ${p.name}? Si solo no hay stock, mejor pausala.`)) startDelete(() => deleteProduct(p.id));
            }}
            className={`${btnGhost} ml-auto text-accent`}
          >
            Borrar prenda
          </button>
        )}
      </div>
    </form>
  );
}
