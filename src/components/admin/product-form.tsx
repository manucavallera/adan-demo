"use client";

import Image from "next/image";
import { useEffect, useRef, useState, useTransition } from "react";
import { ArrowLeft, ArrowRight, CircleNotch, Microphone, Plus, Sparkle, Stop, Trash, UploadSimple } from "@phosphor-icons/react";
import { categories, categoryGroups, discountOf, stockKey } from "@/lib/products";
import { deleteProduct, saveProduct, type ProductInput } from "@/app/admin/(panel)/productos/actions";
import { fillWithAI } from "@/app/admin/(panel)/productos/ai";
import type { QuickFill } from "@/lib/quick-fill";
import { toJpeg } from "@/lib/to-jpeg";
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

// Colores de ropa más comunes, para cargarlos con un toque.
const COLOR_PRESETS: { name: string; hex: string }[] = [
  { name: "Negro", hex: "#1a1a1a" },
  { name: "Blanco", hex: "#f5f5f2" },
  { name: "Gris", hex: "#8a8a8a" },
  { name: "Beige", hex: "#d8c3a5" },
  { name: "Marrón", hex: "#6b4429" },
  { name: "Azul marino", hex: "#1f2a44" },
  { name: "Celeste", hex: "#8db7d8" },
  { name: "Verde militar", hex: "#4b5320" },
  { name: "Bordó", hex: "#6d1a2a" },
];

const MAX_PHOTOS = 8;

function suggestCode(category: string, codes: string[]) {
  const prefix = PREFIX[category] ?? "PRD";
  const used = codes.filter((c) => c.startsWith(`${prefix}-`)).map((c) => Number(c.split("-")[1]) || 0);
  return `${prefix}-${String(Math.max(0, ...used) + 1).padStart(3, "0")}`;
}

function move<T>(list: T[], i: number, dir: -1 | 1) {
  const j = i + dir;
  if (j < 0 || j >= list.length) return list;
  const out = [...list];
  [out[i], out[j]] = [out[j], out[i]];
  return out;
}

// Tira de fotos con flechas para ordenar, botón de borrar y casilla para subir.
function Photos({
  images,
  onChange,
  onUpload,
  uploading,
  label,
}: {
  images: string[];
  onChange: (images: string[]) => void;
  onUpload: (files: FileList | null) => void;
  uploading: boolean;
  label: string;
}) {
  return (
    <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
      {images.map((src, i) => (
        <div key={src} className="relative aspect-[4/5] overflow-hidden bg-line">
          <Image src={src} alt={`${label}, foto ${i + 1}`} fill sizes="150px" className="object-cover" />
          {i === 0 && <span className="absolute top-1 left-1 bg-accent px-1.5 text-[10px] font-semibold text-on-accent">Principal</span>}
          <div className="absolute inset-x-0 bottom-0 flex justify-between bg-ink/70 text-canvas">
            <button type="button" onClick={() => onChange(move(images, i, -1))} disabled={i === 0} aria-label="Mover a la izquierda" className="flex h-8 flex-1 cursor-pointer items-center justify-center disabled:opacity-30">
              <ArrowLeft size={14} />
            </button>
            <button type="button" onClick={() => onChange(images.filter((x) => x !== src))} aria-label="Sacar foto" className="flex h-8 flex-1 cursor-pointer items-center justify-center">
              <Trash size={14} />
            </button>
            <button type="button" onClick={() => onChange(move(images, i, 1))} disabled={i === images.length - 1} aria-label="Mover a la derecha" className="flex h-8 flex-1 cursor-pointer items-center justify-center disabled:opacity-30">
              <ArrowRight size={14} />
            </button>
          </div>
        </div>
      ))}
      {images.length < MAX_PHOTOS && (
        <label className="flex aspect-[4/5] cursor-pointer flex-col items-center justify-center gap-1 border border-dashed border-muted text-center text-xs text-muted hover:border-ink">
          {uploading ? <CircleNotch size={22} className="animate-spin" /> : <UploadSimple size={22} />}
          {uploading ? "Subiendo..." : "Agregar fotos"}
          <input type="file" accept="image/*" multiple className="sr-only" onChange={(e) => { onUpload(e.target.files); e.target.value = ""; }} />
        </label>
      )}
    </div>
  );
}

// Dictado por voz del navegador (Chrome en Android lo trae). Si no hay, queda el micrófono del teclado.
type Recognition = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((e: { resultIndex: number; results: ArrayLike<{ isFinal: boolean; 0: { transcript: string } }> }) => void) | null;
  onend: (() => void) | null;
  onerror: (() => void) | null;
  start: () => void;
  stop: () => void;
};
function getRecognition(): (new () => Recognition) | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as Record<string, unknown>;
  return (w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null) as (new () => Recognition) | null;
}

// Carga rápida: fotos + una línea (escrita o dictada) y la IA completa el formulario de abajo.
function QuickLoad({
  images,
  onUpload,
  onRemove,
  uploading,
  onFill,
}: {
  images: string[];
  onUpload: (files: FileList | null) => void;
  onRemove: (src: string) => void;
  uploading: boolean;
  onFill: (d: QuickFill) => void;
}) {
  const [text, setText] = useState("");
  const [listening, setListening] = useState(false);
  const [canMic, setCanMic] = useState(false);
  const [msg, setMsg] = useState<{ kind: "ok" | "warn" | "error"; text: string } | null>(null);
  const [filling, startFill] = useTransition();
  const rec = useRef<Recognition | null>(null);

  useEffect(() => setCanMic(!!getRecognition()), []);
  useEffect(() => () => rec.current?.stop(), []);

  function toggleMic() {
    if (listening) {
      rec.current?.stop();
      return;
    }
    const R = getRecognition();
    if (!R) return;
    const r = new R();
    r.lang = "es-AR";
    r.continuous = true;
    r.interimResults = false;
    r.onresult = (e) => {
      let said = "";
      for (let i = e.resultIndex; i < e.results.length; i++) if (e.results[i].isFinal) said += e.results[i][0].transcript;
      if (said.trim()) setText((t) => `${t}${t && !t.endsWith(" ") ? " " : ""}${said.trim()}`);
    };
    r.onend = () => setListening(false);
    r.onerror = () => setListening(false);
    rec.current = r;
    r.start();
    setListening(true);
  }

  function fill() {
    rec.current?.stop();
    setMsg(null);
    startFill(async () => {
      try {
        const jpgs = await Promise.all(images.slice(0, 4).map((src) => toJpeg(src, 768)));
        const res = await fillWithAI(text, jpgs);
        if (res.error || !res.data) {
          setMsg({ kind: "error", text: res.error ?? "No se pudo completar." });
          return;
        }
        onFill(res.data);
        setMsg(
          res.data.missing.length
            ? { kind: "warn", text: `Listo. Falta: ${res.data.missing.join(", ")}. Completalo abajo.` }
            : { kind: "ok", text: "Listo. Revisá abajo cómo quedó." },
        );
      } catch {
        setMsg({ kind: "error", text: "No se pudo completar. Probá de nuevo." });
      }
    });
  }

  return (
    <section className="border border-accent bg-surface p-4 lg:col-span-2">
      <h2 className="flex items-center gap-2 font-semibold">
        <Sparkle size={18} weight="fill" className="text-accent" /> Carga rápida
      </h2>
      <p className="mb-4 text-xs text-muted">
        Sacá las fotos y decí la prenda en una línea. Ej: «remera oversize negra y blanca, M 3, L 2, XL 1, 25 mil». La IA completa el formulario.
      </p>
      <div className="mb-4 flex flex-wrap gap-2">
        {images.map((src, i) => (
          <div key={src} className="relative h-24 w-20 overflow-hidden bg-line">
            <Image src={src} alt={`Foto ${i + 1}`} fill sizes="80px" className="object-cover" />
            <button type="button" onClick={() => onRemove(src)} aria-label="Sacar foto" className="absolute top-0 right-0 flex size-7 cursor-pointer items-center justify-center bg-ink/70 text-canvas">
              <Trash size={12} />
            </button>
          </div>
        ))}
        {images.length < MAX_PHOTOS && (
          <label className="flex h-24 w-20 cursor-pointer flex-col items-center justify-center gap-1 border border-dashed border-muted text-center text-[11px] text-muted hover:border-ink">
            {uploading ? <CircleNotch size={20} className="animate-spin" /> : <UploadSimple size={20} />}
            {uploading ? "Subiendo" : "Fotos"}
            <input type="file" accept="image/*" multiple className="sr-only" onChange={(e) => { onUpload(e.target.files); e.target.value = ""; }} />
          </label>
        )}
      </div>
      <div className="flex gap-2">
        <label htmlFor="quick-text" className="sr-only">
          Prenda en una línea
        </label>
        <textarea
          id="quick-text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={2}
          maxLength={1000}
          placeholder={canMic ? "Escribí o tocá el micrófono y hablá" : "Escribí, o usá el micrófono del teclado"}
          className={`${input} h-auto flex-1 py-2`}
        />
        {canMic && (
          <button
            type="button"
            onClick={toggleMic}
            aria-label={listening ? "Dejar de escuchar" : "Hablar"}
            className={`flex w-14 shrink-0 cursor-pointer flex-col items-center justify-center gap-0.5 text-[11px] font-semibold ${listening ? "animate-pulse bg-danger text-white" : "bg-accent text-on-accent"}`}
          >
            {listening ? <Stop size={22} weight="fill" /> : <Microphone size={22} weight="fill" />}
            {listening ? "Listo" : "Hablar"}
          </button>
        )}
      </div>
      <button type="button" onClick={fill} disabled={filling || uploading || (!text.trim() && images.length === 0)} className={`${btnPrimary} mt-3 w-full sm:w-auto`}>
        {filling ? <CircleNotch size={16} className="animate-spin" /> : <Sparkle size={16} weight="fill" />}
        {filling ? "Completando..." : "Completar con IA"}
      </button>
      {msg && (
        <p
          role="status"
          className={`mt-3 border-l-4 p-3 text-sm font-medium ${
            msg.kind === "ok" ? "border-ok bg-ok-soft text-ok" : msg.kind === "warn" ? "border-warn bg-warn-soft text-warn" : "border-danger bg-danger-soft text-danger"
          }`}
        >
          {msg.text}
        </p>
      )}
    </section>
  );
}

export function ProductForm({ initial, existingCodes }: { initial: ProductInput | null; existingCodes: string[] }) {
  const [p, setP] = useState<ProductInput>(
    initial ?? {
      id: suggestCode("remeras", existingCodes),
      isNewProduct: true,
      name: "",
      category: "remeras",
      price: 0,
      oldPrice: 0,
      color: "",
      description: "",
      images: [],
      isNew: true,
      active: true,
      colors: [],
      sizes: PRESETS[0].sizes,
      stock: {},
    },
  );
  const [error, setError] = useState("");
  // Prenda nueva: primero solo la carga rápida; después de la IA, un resumen con Publicar.
  // El formulario completo aparece al editar, con "Corregir algo" o con "Cargar a mano".
  const [view, setView] = useState<"quick" | "summary" | "full">(initial ? "full" : "quick");
  const [missing, setMissing] = useState<string[]>([]);
  // Qué tira de fotos está subiendo: "general" o el número de color.
  const [uploading, setUploading] = useState<Record<string, number>>({});
  const [saving, startSave] = useTransition();
  const [deleting, startDelete] = useTransition();

  const set = <K extends keyof ProductInput>(k: K, v: ProductInput[K]) => setP((x) => ({ ...x, [k]: v }));
  const multi = p.colors.length > 0;
  const busy = Object.values(uploading).some((n) => n > 0);

  // Sube fotos a la tira general (target = "general") o a la de un color (target = índice).
  async function upload(files: FileList | null, target: "general" | number) {
    if (!files?.length) return;
    setError("");
    const current = target === "general" ? p.images : p.colors[target]?.images ?? [];
    const list = [...files].slice(0, MAX_PHOTOS - current.length);
    const tag = String(target);
    setUploading((u) => ({ ...u, [tag]: (u[tag] ?? 0) + list.length }));
    for (const file of list) {
      try {
        const body = new FormData();
        body.append("file", file);
        const res = await fetch("/api/admin/upload", { method: "POST", body });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        setP((x) =>
          target === "general"
            ? { ...x, images: [...x.images, data.src] }
            : { ...x, colors: x.colors.map((c, i) => (i === target ? { ...c, images: [...c.images, data.src] } : c)) },
        );
      } catch (e) {
        setError(e instanceof Error && e.message ? e.message : "No se pudo subir una foto.");
      } finally {
        setUploading((u) => ({ ...u, [tag]: (u[tag] ?? 1) - 1 }));
      }
    }
  }

  // Al renombrar un color, su stock se mueve con él.
  function renameColor(i: number, name: string) {
    setP((x) => {
      const old = x.colors[i].name;
      const stock = { ...x.stock };
      for (const s of x.sizes) {
        if (stockKey(old, s) in stock) {
          stock[stockKey(name, s)] = stock[stockKey(old, s)];
          delete stock[stockKey(old, s)];
        }
      }
      return { ...x, stock, colors: x.colors.map((c, j) => (j === i ? { ...c, name } : c)) };
    });
  }

  function addColor(preset?: { name: string; hex: string }) {
    setP((x) => {
      // La primera vez que pasa a varios colores, el stock y las fotos de "un solo color" van al primer color.
      if (x.colors.length === 0 && preset) {
        const stock: Record<string, number> = {};
        for (const s of x.sizes) stock[stockKey(preset.name, s)] = x.stock[stockKey("", s)] ?? 0;
        return { ...x, stock, colors: [{ ...preset, images: x.images }] };
      }
      return { ...x, colors: [...x.colors, { name: preset?.name ?? "", hex: preset?.hex ?? "#888888", images: [] }] };
    });
  }

  // Pasa a varios colores: lo cargado (fotos y stock) queda como primer color.
  function toMulti() {
    const name = p.color.split(/,|\/| y /)[0].trim();
    const preset = COLOR_PRESETS.find((c) => c.name.toLowerCase() === name.toLowerCase());
    addColor(preset ?? { name: name || "Negro", hex: name ? "#888888" : COLOR_PRESETS[0].hex });
  }

  // Vuelve a un solo color: queda el primero, con sus fotos y su stock.
  function toSingle() {
    if (p.colors.length > 1 && !confirm(`Queda solo ${p.colors[0].name || "el primer color"}. Los otros colores y sus fotos se sacan. ¿Seguir?`)) return;
    const first = p.colors[0];
    setP((x) => {
      const stock: Record<string, number> = {};
      for (const s of x.sizes) stock[stockKey("", s)] = x.stock[stockKey(first.name, s)] ?? 0;
      return { ...x, colors: [], stock, images: first.images, color: first.name };
    });
  }

  function removeColor(i: number) {
    const c = p.colors[i];
    if (c.images.length && !confirm(`¿Sacar el color ${c.name || "sin nombre"} con sus fotos?`)) return;
    setP((x) => {
      const colors = x.colors.filter((_, j) => j !== i);
      // Si queda sin colores, vuelve a "un solo color" con el stock y las fotos del que quedaba.
      if (colors.length === 0) {
        const stock: Record<string, number> = {};
        for (const s of x.sizes) stock[stockKey("", s)] = x.stock[stockKey(c.name, s)] ?? 0;
        return { ...x, colors, stock, images: c.images };
      }
      return { ...x, colors };
    });
  }

  // Vuelca lo que armó la IA en el formulario. Las fotos ya subidas se reparten por color.
  function applyFill(d: QuickFill) {
    setMissing(d.missing);
    setView((v) => (v === "full" ? "full" : "summary"));
    setP((x) => {
      const imgs = x.images;
      const hex = (h: string) => (/^#[0-9a-f]{6}$/i.test(h) ? h : "#888888");
      const many = d.colors.length > 1;
      const colors = many
        ? d.colors.map((c) => ({ name: c.name.slice(0, 30), hex: hex(c.hex), images: c.photos.map((n) => imgs[n]).filter(Boolean) }))
        : [];
      if (many) {
        const used = new Set(colors.flatMap((c) => c.images));
        colors[0].images = [...colors[0].images, ...imgs.filter((src) => !used.has(src))];
      }
      const sizes = d.sizes.length ? [...new Set(d.sizes.map((s) => s.trim()).filter(Boolean))] : x.sizes;
      const stock: Record<string, number> = {};
      for (const s of d.stock) {
        const color = many ? colors.find((c) => c.name.toLowerCase() === s.color.trim().toLowerCase())?.name : "";
        if (color === undefined || !sizes.includes(s.size)) continue;
        stock[stockKey(color, s.size)] = Math.max(0, s.qty);
      }
      const category = categories.some((c) => c.id === d.category) ? d.category : x.category;
      return {
        ...x,
        name: d.name || x.name,
        category,
        id: x.isNewProduct ? suggestCode(category, existingCodes) : x.id,
        price: d.price > 0 ? d.price : x.price,
        oldPrice: d.oldPrice > d.price ? d.oldPrice : 0,
        description: d.description || x.description,
        color: many ? "" : (d.colors[0]?.name ?? x.color),
        colors,
        sizes,
        stock,
      };
    });
  }

  const setStock = (color: string, size: string, n: number) =>
    setP((x) => ({ ...x, stock: { ...x.stock, [stockKey(color, size)]: Math.max(0, Math.floor(n) || 0) } }));

  function save(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    startSave(async () => {
      const res = await saveProduct(p);
      if (res?.error) setError(res.error);
    });
  }

  const rows: { name: string; hex?: string }[] = multi ? p.colors : [{ name: "" }];
  const unusedPresets = COLOR_PRESETS.filter((c) => !p.colors.some((x) => x.name.toLowerCase() === c.name.toLowerCase()));

  return (
    <form onSubmit={save} className="grid gap-8 lg:grid-cols-2">
      {p.isNewProduct && (
        <QuickLoad
          images={p.images}
          onUpload={(f) => void upload(f, "general")}
          onRemove={(src) => set("images", p.images.filter((x) => x !== src))}
          uploading={(uploading.general ?? 0) > 0}
          onFill={applyFill}
        />
      )}
      {view === "quick" && (
        <button type="button" onClick={() => setView("full")} className="w-fit cursor-pointer text-sm text-muted underline underline-offset-4 hover:text-ink lg:col-span-2">
          Prefiero cargar todo a mano
        </button>
      )}

      {view === "summary" && (
        <section className="border border-line bg-canvas p-4 lg:col-span-2">
          <h2 className="mb-3 font-semibold">Así queda en la tienda</h2>
          <div className="flex gap-4">
            {(multi ? p.colors[0]?.images[0] : p.images[0]) && (
              <div className="relative h-32 w-24 shrink-0 overflow-hidden bg-line">
                <Image src={(multi ? p.colors[0].images[0] : p.images[0])!} alt={p.name} fill sizes="96px" className="object-cover" />
              </div>
            )}
            <div className="min-w-0 space-y-1 text-sm">
              <p className="text-base font-semibold">{p.name || "Sin nombre"}</p>
              <p>
                {p.price > 0 ? `$ ${p.price.toLocaleString("es-AR")}` : <span className="font-semibold text-warn">Sin precio</span>}
                {p.oldPrice > p.price && <span className="ml-2 text-muted line-through">$ {p.oldPrice.toLocaleString("es-AR")}</span>}
                <span className="text-muted"> · {categories.find((c) => c.id === p.category)?.label}</span>
              </p>
              {rows.map((r) => (
                <p key={r.name}>
                  {multi && <span className="font-medium">{r.name}: </span>}
                  {!multi && p.color && <span className="font-medium">{p.color}: </span>}
                  {p.sizes.map((sz) => `${sz} (${p.stock[stockKey(r.name, sz)] ?? 0})`).join(" · ")}
                </p>
              ))}
              {p.description && <p className="text-muted">{p.description}</p>}
            </div>
          </div>

          {!(p.price > 0) && (
            <div className="mt-4 max-w-xs">
              <Field label="¿A cuánto la vendés?" htmlFor="quick-price">
                <input id="quick-price" type="number" inputMode="numeric" min={1} value={p.price || ""} onChange={(e) => set("price", Number(e.target.value))} placeholder="Ej: 25000" className={input} />
              </Field>
            </div>
          )}
          {!p.name.trim() && (
            <div className="mt-4 max-w-xs">
              <Field label="Nombre de la prenda" htmlFor="quick-name">
                <input id="quick-name" value={p.name} onChange={(e) => set("name", e.target.value)} maxLength={80} className={input} />
              </Field>
            </div>
          )}
          {(missing.includes("stock") || Object.values(p.stock).every((n) => !n)) && (
            <p className="mt-4 text-sm font-medium text-warn">No dijiste cuántas tenés: va a salir agotada. Tocá «Corregir algo» para cargar el stock.</p>
          )}

          {error && (
            <p role="alert" className="mt-4 border-l-4 border-danger bg-danger-soft p-3 text-sm font-medium text-danger">
              {error}
            </p>
          )}
          <div className="mt-5 flex flex-wrap gap-3">
            <button type="submit" disabled={saving || busy || !(p.price > 0) || !p.name.trim()} className={btnPrimary}>
              {saving && <CircleNotch size={16} className="animate-spin" />} Publicar
            </button>
            <button type="button" onClick={() => setView("full")} className={btnGhost}>
              Corregir algo
            </button>
          </div>
        </section>
      )}

      {view === "full" && (
      <>
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
          <Field label="Precio" htmlFor="price" hint="En pesos, sin puntos. Mismo precio para todos los colores.">
            <input id="price" type="number" inputMode="numeric" min={1} value={p.price || ""} onChange={(e) => set("price", Number(e.target.value))} required className={input} />
          </Field>
          <Field
            label="Precio de antes (oferta)"
            htmlFor="oldPrice"
            hint={discountOf(p) ? `Se ve tachado con −${discountOf(p)}%. Borralo para sacar la oferta.` : "Opcional. Si lo cargás, la prenda sale en Ofertas."}
          >
            <input id="oldPrice" type="number" inputMode="numeric" min={0} value={p.oldPrice || ""} onChange={(e) => set("oldPrice", Number(e.target.value))} placeholder="Sin oferta" className={input} />
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
          <h2 className="mb-1 font-semibold">Colores y fotos</h2>
          <div role="radiogroup" aria-label="Colores" className="mb-4 grid grid-cols-2 border border-line">
            {[
              { on: !multi, label: "Un solo color", go: toSingle },
              { on: multi, label: "Varios colores", go: toMulti },
            ].map((o) => (
              <button
                key={o.label}
                type="button"
                role="radio"
                aria-checked={o.on}
                onClick={() => !o.on && o.go()}
                className={`h-11 cursor-pointer text-sm font-semibold ${o.on ? "bg-accent text-on-accent" : "text-muted hover:text-ink"}`}
              >
                {o.label}
              </button>
            ))}
          </div>

          {!multi ? (
            <div className="space-y-4">
              <Field label="Color" htmlFor="color" hint="Ej: Negro. Si viene en varios, elegí “Varios colores” así cada uno tiene su stock.">
                <input id="color" value={p.color} onChange={(e) => set("color", e.target.value)} maxLength={120} className={input} />
              </Field>
              <div>
                <p className="mb-2 text-xs text-muted">La primera foto es la principal. Hasta {MAX_PHOTOS}.</p>
                <Photos images={p.images} onChange={(images) => set("images", images)} onUpload={(f) => void upload(f, "general")} uploading={(uploading.general ?? 0) > 0} label={p.name} />
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-xs text-muted">Cada color tiene sus fotos y su stock. El primero es el que se ve en la tienda.</p>
              <ul className="space-y-4">
                {p.colors.map((c, i) => (
                  <li key={i} className="border border-line bg-surface p-3">
                    <div className="mb-3 flex items-center gap-2">
                      <label className="relative size-11 shrink-0 cursor-pointer overflow-hidden rounded-full border border-line" style={{ background: c.hex }}>
                        <span className="sr-only">Tono del color {c.name}</span>
                        <input type="color" value={c.hex} onChange={(e) => setP((x) => ({ ...x, colors: x.colors.map((y, j) => (j === i ? { ...y, hex: e.target.value } : y)) }))} className="absolute inset-0 cursor-pointer opacity-0" />
                      </label>
                      <input aria-label="Nombre del color" value={c.name} onChange={(e) => renameColor(i, e.target.value)} placeholder="Nombre del color" maxLength={30} className={`${input} flex-1`} />
                      <button type="button" onClick={() => setP((x) => ({ ...x, colors: move(x.colors, i, -1) }))} disabled={i === 0} aria-label="Subir color" className="flex size-11 cursor-pointer items-center justify-center text-muted hover:text-ink disabled:opacity-30">
                        <ArrowLeft size={16} className="rotate-90" />
                      </button>
                      <button type="button" onClick={() => removeColor(i)} aria-label={`Sacar color ${c.name}`} className="flex size-11 cursor-pointer items-center justify-center text-muted hover:text-danger">
                        <Trash size={18} />
                      </button>
                    </div>
                    {c.images.length === 0 && i > 0 && (
                      <p className="mb-2 text-xs font-medium text-warn">Sin fotos: en la web se ven las del primer color. Subí una de este color.</p>
                    )}
                    <Photos
                      images={c.images}
                      onChange={(images) => setP((x) => ({ ...x, colors: x.colors.map((y, j) => (j === i ? { ...y, images } : y)) }))}
                      onUpload={(f) => void upload(f, i)}
                      uploading={(uploading[String(i)] ?? 0) > 0}
                      label={`${p.name} ${c.name}`}
                    />
                  </li>
                ))}
              </ul>
              <div>
                <p className="mb-2 text-sm font-semibold">Agregar color</p>
                <div className="flex flex-wrap gap-2">
                  {unusedPresets.map((c) => (
                    <button key={c.name} type="button" onClick={() => addColor(c)} className="flex h-9 cursor-pointer items-center gap-2 border border-line px-3 text-xs hover:border-ink">
                      <span className="size-3.5 rounded-full border border-line" style={{ background: c.hex }} />
                      {c.name}
                    </button>
                  ))}
                  <button type="button" onClick={() => addColor()} className="flex h-9 cursor-pointer items-center gap-1 border border-dashed border-muted px-3 text-xs hover:border-ink">
                    <Plus size={12} /> Otro
                  </button>
                </div>
              </div>
            </div>
          )}
        </section>

        <section>
          <h2 className="mb-1 font-semibold">Talles y stock</h2>
          <div className="mb-3 flex flex-wrap gap-2">
            {PRESETS.map((pr) => (
              <button key={pr.label} type="button" onClick={() => set("sizes", pr.sizes)} className="h-9 cursor-pointer border border-line px-3 text-xs hover:border-ink">
                {pr.label}
              </button>
            ))}
          </div>
          <div className="mb-4 flex flex-wrap items-center gap-2">
            {p.sizes.map((s, i) => (
              <span key={i} className="flex items-center border border-line">
                <input
                  aria-label="Talle"
                  value={s}
                  onChange={(e) => {
                    const next = e.target.value;
                    setP((x) => {
                      const stock = { ...x.stock };
                      for (const r of rows) {
                        stock[stockKey(r.name, next)] = x.stock[stockKey(r.name, s)] ?? 0;
                        delete stock[stockKey(r.name, s)];
                      }
                      return { ...x, stock, sizes: x.sizes.map((y, j) => (j === i ? next : y)) };
                    });
                  }}
                  placeholder="Talle"
                  maxLength={12}
                  className="h-9 w-16 bg-transparent px-2 text-center text-sm outline-none"
                />
                <button type="button" onClick={() => set("sizes", p.sizes.filter((_, j) => j !== i))} aria-label={`Sacar talle ${s}`} className="flex h-9 w-8 cursor-pointer items-center justify-center text-muted hover:text-danger">
                  <Trash size={14} />
                </button>
              </span>
            ))}
            <button type="button" onClick={() => set("sizes", [...p.sizes, ""])} className="h-9 cursor-pointer px-2 text-sm font-semibold text-accent">
              + Talle
            </button>
          </div>

          {p.sizes.length > 0 && (
            <div className="overflow-x-auto">
              <table className="text-sm">
                <thead>
                  <tr>
                    <th className="pr-3 text-left font-normal text-muted">{multi ? "Color" : ""}</th>
                    {p.sizes.map((s, i) => (
                      <th key={i} className="px-1 pb-1 text-center font-semibold">{s || "?"}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.name}>
                      <th scope="row" className="pr-3 text-left font-medium whitespace-nowrap">
                        {multi ? (
                          <span className="flex items-center gap-2">
                            <span className="size-3.5 rounded-full border border-line" style={{ background: r.hex }} />
                            {r.name || "Sin nombre"}
                          </span>
                        ) : (
                          <span className="text-muted">Unidades</span>
                        )}
                      </th>
                      {p.sizes.map((s, i) => {
                        const n = p.stock[stockKey(r.name, s)] ?? 0;
                        return (
                          <td key={i} className="p-1">
                            <input
                              aria-label={`Stock ${r.name} talle ${s}`}
                              type="number"
                              inputMode="numeric"
                              min={0}
                              value={n}
                              onFocus={(e) => e.target.select()}
                              onChange={(e) => setStock(r.name, s, Number(e.target.value))}
                              className={`h-11 w-14 border text-center tabular-nums outline-none focus:border-ink ${n === 0 ? "border-danger/40 bg-danger-soft text-danger" : "border-line bg-canvas"}`}
                            />
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>

      <div className="flex flex-wrap items-center gap-3 border-t border-line pt-6 lg:col-span-2">
        {error && (
          <p role="alert" className="w-full border-l-4 border-danger bg-danger-soft p-3 text-sm font-medium text-danger">
            {error}
          </p>
        )}
        <button type="submit" disabled={saving || busy} className={btnPrimary}>
          {saving && <CircleNotch size={16} className="animate-spin" />} Guardar
        </button>
        {!p.isNewProduct && (
          <button
            type="button"
            disabled={deleting}
            onClick={() => {
              if (confirm(`¿Borrar ${p.name}? Si solo no hay stock, mejor pausala.`)) startDelete(() => deleteProduct(p.id));
            }}
            className={`${btnGhost} ml-auto text-danger`}
          >
            Borrar prenda
          </button>
        )}
      </div>
      </>
      )}
    </form>
  );
}
