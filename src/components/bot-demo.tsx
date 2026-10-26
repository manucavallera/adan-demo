"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  ChatCircleText,
  X,
  PaperPlaneRight,
  Camera,
  CheckCircle,
  BellRinging,
  ArrowsCounterClockwise,
} from "@phosphor-icons/react";
import { products } from "@/lib/products";
import { formatPrice, store } from "@/lib/config";

// Demo del asistente de WhatsApp. Se ve como un chat y por detrás usa la IA real (/api/chat).
// La pestaña "Vista del dueño" muestra lo que le llegaría al dueño: ficha del pedido y avisos.

type Order = {
  cliente: string;
  producto: string;
  talle: string;
  cantidad: string;
  entrega: string;
  direccion: string;
  pago: string;
};

type BotOut = {
  reply: string;
  productos: string[];
  pedido: Order;
  total: number;
  estado: string;
  mandar_link_pago: boolean;
  pasar_al_dueno: boolean;
  motivo: string;
  aviso_dueno: string;
};

type Msg = {
  role: "user" | "assistant";
  text: string;
  image?: string;
  productos?: string[];
  pay?: number;
  handoff?: string;
  time: string;
};

const SUGGESTIONS = [
  "¿Tenés el pantalón de vestir en 44?",
  "Tengo un casamiento, ¿qué me pongo?",
  "Hola! Quiero BER-001 talle 44",
  "¿Me hacés 30% de descuento?",
];

const EMPTY_ORDER: Order = { cliente: "", producto: "", talle: "", cantidad: "", entrega: "", direccion: "", pago: "" };
const now = () => new Date().toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" });

// Achica la foto antes de mandarla: más rápida y más barata.
async function toJpeg(src: string | File, max = 800): Promise<string> {
  const url = typeof src === "string" ? src : URL.createObjectURL(src);
  const img = document.createElement("img");
  img.src = url;
  await img.decode();
  const scale = Math.min(1, max / Math.max(img.naturalWidth, img.naturalHeight));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(img.naturalWidth * scale);
  canvas.height = Math.round(img.naturalHeight * scale);
  canvas.getContext("2d")!.drawImage(img, 0, 0, canvas.width, canvas.height);
  if (typeof src !== "string") URL.revokeObjectURL(url);
  return canvas.toDataURL("image/jpeg", 0.8);
}

export function openBot(text?: string) {
  window.dispatchEvent(new CustomEvent("open-bot", { detail: text }));
}

export function BotDemo() {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<"chat" | "owner">("chat");
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [typing, setTyping] = useState(false);
  const [error, setError] = useState("");
  const [order, setOrder] = useState<{ pedido: Order; total: number; estado: string }>({
    pedido: EMPTY_ORDER,
    total: 0,
    estado: "Sin consultas",
  });
  const [alerts, setAlerts] = useState<{ text: string; time: string; kind: "aviso" | "pase" | "pago" }[]>([]);
  const [paid, setPaid] = useState(false);
  const scroller = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const busy = useRef(false);

  useEffect(() => {
    scroller.current?.scrollTo({ top: scroller.current.scrollHeight, behavior: "smooth" });
  }, [msgs, typing]);

  const send = useCallback(
    async (text: string, image?: string) => {
      if (busy.current || (!text.trim() && !image)) return;
      busy.current = true;
      setError("");
      const userMsg: Msg = { role: "user", text: text.trim(), image, time: now() };
      const history = [...msgs, userMsg];
      setMsgs(history);
      setInput("");
      setTyping(true);
      try {
        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            messages: history.slice(-30).map((m) => ({ role: m.role, text: m.text, ...(m.image ? { image: m.image } : {}) })),
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "No pude responder");
        const out = data as BotOut;
        setMsgs((m) => [
          ...m,
          {
            role: "assistant",
            text: out.reply,
            productos: out.productos,
            pay: out.mandar_link_pago && out.total > 0 ? out.total : undefined,
            handoff: out.pasar_al_dueno ? out.motivo : undefined,
            time: now(),
          },
        ]);
        setOrder({ pedido: out.pedido, total: out.total, estado: out.estado });
        const t = now();
        setAlerts((a) => [
          ...(out.pasar_al_dueno ? [{ text: `Te pasé un cliente: ${out.motivo}`, time: t, kind: "pase" as const }] : []),
          ...(out.aviso_dueno ? [{ text: out.aviso_dueno, time: t, kind: "aviso" as const }] : []),
          ...a,
        ]);
      } catch (e) {
        setError(e instanceof Error ? e.message : "No pude responder");
      } finally {
        setTyping(false);
        busy.current = false;
      }
    },
    [msgs],
  );

  // Los botones "Consultar por WhatsApp" de la demo abren este chat con el mensaje armado.
  useEffect(() => {
    const onOpen = (e: Event) => {
      setOpen(true);
      setTab("chat");
      const text = (e as CustomEvent<string | undefined>).detail;
      if (text) setInput(text);
    };
    window.addEventListener("open-bot", onOpen);
    return () => window.removeEventListener("open-bot", onOpen);
  }, []);

  function reset() {
    setMsgs([]);
    setOrder({ pedido: EMPTY_ORDER, total: 0, estado: "Sin consultas" });
    setAlerts([]);
    setPaid(false);
    setError("");
  }

  function pay(total: number) {
    if (paid) return;
    setPaid(true);
    const t = now();
    setMsgs((m) => [...m, { role: "assistant", text: `Listo, nos llegó tu pago de ${formatPrice(total)}. Gracias! Te avisamos por acá cuando sale.`, time: t }]);
    setOrder((o) => ({ ...o, estado: "Pagado" }));
    setAlerts((a) => [{ text: `Pago aprobado por ${formatPrice(total)}. El stock ya se descontó.`, time: t, kind: "pago" }, ...a]);
  }

  const unread = alerts.length;

  return (
    <>
      <AnimatePresence>
        {!open && (
          <motion.button
            type="button"
            onClick={() => setOpen(true)}
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            whileHover={{ y: -3 }}
            whileTap={{ scale: 0.95 }}
            transition={{ type: "spring", stiffness: 400, damping: 22, delay: 0.8 }}
            className="fixed right-4 bottom-28 z-30 flex h-14 cursor-pointer items-center gap-2 bg-accent pr-5 pl-4 font-semibold text-on-accent shadow-[0_12px_32px_-8px_rgba(30,25,21,0.45)] md:right-8 md:bottom-8"
          >
            <ChatCircleText size={24} weight="fill" />
            Probá el asistente
          </motion.button>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {open && (
          <motion.section
            role="dialog"
            aria-label="Demo del asistente de WhatsApp"
            initial={{ opacity: 0, y: 40, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 40, scale: 0.97 }}
            transition={{ type: "spring", stiffness: 320, damping: 30 }}
            className="fixed inset-0 z-50 flex flex-col overflow-hidden bg-surface md:inset-auto md:right-8 md:bottom-8 md:h-[min(720px,calc(100dvh-4rem))] md:w-[400px] md:border md:border-line md:shadow-[0_24px_60px_-12px_rgba(30,25,21,0.45)]"
          >
            {/* Encabezado tipo WhatsApp */}
            <header className="flex items-center gap-3 bg-[#1f2c33] px-4 py-3 text-white">
              <div className="flex h-10 w-10 items-center justify-center bg-accent font-display text-lg text-on-accent">A</div>
              <div className="min-w-0 flex-1">
                <p className="font-semibold leading-tight">{store.name} Indumentaria</p>
                <p className="text-xs text-white/70">{typing ? "escribiendo..." : "en línea"}</p>
              </div>
              <button type="button" onClick={reset} aria-label="Empezar de nuevo" className="flex h-10 w-10 cursor-pointer items-center justify-center text-white/80 hover:text-white">
                <ArrowsCounterClockwise size={20} />
              </button>
              <button type="button" onClick={() => setOpen(false)} aria-label="Cerrar" className="flex h-10 w-10 cursor-pointer items-center justify-center text-white/80 hover:text-white">
                <X size={22} />
              </button>
            </header>

            <div role="tablist" className="grid grid-cols-2 border-b border-line text-sm font-semibold">
              {(
                [
                  ["chat", "Lo que ve el cliente"],
                  ["owner", "Lo que ve el dueño"],
                ] as const
              ).map(([id, label]) => (
                <button
                  key={id}
                  role="tab"
                  type="button"
                  aria-selected={tab === id}
                  onClick={() => setTab(id)}
                  className={`relative h-11 cursor-pointer ${tab === id ? "text-ink" : "text-muted"}`}
                >
                  {label}
                  {id === "owner" && unread > 0 && (
                    <span className="ml-2 inline-flex h-5 min-w-5 items-center justify-center bg-accent px-1 text-[11px] text-on-accent">{unread}</span>
                  )}
                  {tab === id && <motion.span layoutId="bot-tab" className="absolute inset-x-0 bottom-0 h-0.5 bg-accent" />}
                </button>
              ))}
            </div>

            {tab === "chat" ? (
              <>
                <div ref={scroller} className="flex-1 space-y-2 overflow-y-auto bg-[#efeae2] px-3 py-4 dark:bg-[#0b141a]">
                  <p className="mx-auto w-fit bg-[#fff6c5] px-3 py-1.5 text-center text-xs text-[#54656f] dark:bg-[#182229] dark:text-[#ffd279]">
                    Demo con IA real. Escribí como si fueras un cliente.
                  </p>
                  {msgs.length === 0 && (
                    <div className="space-y-2 pt-4">
                      {SUGGESTIONS.map((s) => (
                        <button key={s} type="button" onClick={() => send(s)} className="block w-fit cursor-pointer border border-[#d1d7db] bg-white px-3 py-2 text-left text-sm text-[#111b21] transition-transform active:scale-[0.98] dark:border-[#2a3942] dark:bg-[#202c33] dark:text-[#e9edef]">
                          {s}
                        </button>
                      ))}
                      <button
                        type="button"
                        onClick={async () => send("Hola, ¿cuánto sale esta?", await toJpeg("/img/adan/estado-ejemplo.jpg"))}
                        className="flex w-fit cursor-pointer items-center gap-2 border border-[#d1d7db] bg-white px-3 py-2 text-sm text-[#111b21] transition-transform active:scale-[0.98] dark:border-[#2a3942] dark:bg-[#202c33] dark:text-[#e9edef]"
                      >
                        <Camera size={16} /> Mandar captura de un estado
                      </button>
                    </div>
                  )}
                  {msgs.map((m, i) => (
                    <Bubble key={i} m={m} paid={paid} onPay={pay} />
                  ))}
                  {typing && (
                    <div className="flex w-fit gap-1 bg-white px-4 py-3 dark:bg-[#202c33]">
                      {[0, 1, 2].map((d) => (
                        <motion.span
                          key={d}
                          className="h-2 w-2 rounded-full bg-[#8696a0]"
                          animate={{ y: [0, -4, 0] }}
                          transition={{ duration: 0.8, repeat: Infinity, delay: d * 0.15 }}
                        />
                      ))}
                    </div>
                  )}
                  {error && <p role="alert" className="mx-auto w-fit bg-[#ffe1e1] px-3 py-1.5 text-xs text-[#8a1c1c]">{error}</p>}
                </div>

                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    send(input);
                  }}
                  className="flex items-center gap-2 bg-[#f0f2f5] px-2 py-2 dark:bg-[#202c33]"
                >
                  <input
                    ref={fileRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={async (e) => {
                      const f = e.target.files?.[0];
                      e.target.value = "";
                      if (f) send(input || "", await toJpeg(f));
                    }}
                  />
                  <button type="button" onClick={() => fileRef.current?.click()} aria-label="Mandar foto" className="flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center text-[#54656f] dark:text-[#aebac1]">
                    <Camera size={24} />
                  </button>
                  <label htmlFor="bot-input" className="sr-only">
                    Mensaje
                  </label>
                  <input
                    id="bot-input"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    maxLength={500}
                    placeholder="Escribí un mensaje"
                    className="h-11 min-w-0 flex-1 bg-white px-4 text-base text-[#111b21] outline-none placeholder:text-[#667781] dark:bg-[#2a3942] dark:text-[#e9edef] dark:placeholder:text-[#8696a0]"
                  />
                  <button type="submit" disabled={typing || !input.trim()} aria-label="Enviar" className="flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center bg-[#00a884] text-white transition-transform active:scale-95 disabled:opacity-50">
                    <PaperPlaneRight size={20} weight="fill" />
                  </button>
                </form>
              </>
            ) : (
              <OwnerView order={order} alerts={alerts} />
            )}
          </motion.section>
        )}
      </AnimatePresence>
    </>
  );
}

function Bubble({ m, paid, onPay }: { m: Msg; paid: boolean; onPay: (total: number) => void }) {
  const mine = m.role === "user";
  return (
    <motion.div
      initial={{ opacity: 0, y: 8, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.25 }}
      className={`flex flex-col gap-2 ${mine ? "items-end" : "items-start"}`}
    >
      <div className={`max-w-[85%] px-3 pt-2 pb-1 text-[15px] leading-snug shadow-sm ${mine ? "bg-[#d9fdd3] text-[#111b21] dark:bg-[#005c4b] dark:text-[#e9edef]" : "bg-white text-[#111b21] dark:bg-[#202c33] dark:text-[#e9edef]"}`}>
        {m.image && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={m.image} alt="Foto enviada por el cliente" className="mb-2 max-h-56 w-auto" />
        )}
        {m.text && <p className="whitespace-pre-wrap">{m.text}</p>}
        <p className="mt-0.5 text-right text-[11px] text-[#667781] dark:text-[#8696a0]">{m.time}</p>
      </div>

      {m.productos?.map((id) => {
        const p = products.find((x) => x.id === id);
        if (!p) return null;
        return (
          <Link key={id} href={`/producto/${p.slug}`} className="flex w-64 max-w-[85%] gap-3 bg-white p-2 text-[#111b21] shadow-sm dark:bg-[#202c33] dark:text-[#e9edef]">
            <div className="relative h-20 w-16 shrink-0 overflow-hidden">
              <Image src={p.image} alt={p.name} fill sizes="64px" className="object-cover" />
            </div>
            <div className="min-w-0 text-sm">
              <p className="font-semibold leading-tight">{p.name}</p>
              <p className="text-[#667781] dark:text-[#8696a0]">{p.id}</p>
              <p className="mt-1 font-semibold">{formatPrice(p.price)}</p>
            </div>
          </Link>
        );
      })}

      {m.pay !== undefined && (
        <div className="w-64 max-w-[85%] bg-white p-3 text-[#111b21] shadow-sm dark:bg-[#202c33] dark:text-[#e9edef]">
          <p className="text-xs text-[#667781] dark:text-[#8696a0]">mercadopago.com.ar</p>
          <p className="font-semibold">Pagá tu pedido de {store.name}</p>
          <p className="text-sm">
            {formatPrice(m.pay)} · {store.installments}
          </p>
          <button
            type="button"
            onClick={() => onPay(m.pay!)}
            disabled={paid}
            className="mt-2 h-10 w-full cursor-pointer bg-[#009ee3] text-sm font-semibold text-white disabled:cursor-default disabled:bg-[#00a884]"
          >
            {paid ? "Pagado" : "Pagar (simulado)"}
          </button>
        </div>
      )}

      {m.handoff && (
        <p className="mx-auto w-fit bg-[#fff6c5] px-3 py-1.5 text-center text-xs text-[#54656f] dark:bg-[#182229] dark:text-[#ffd279]">
          Chat pasado al dueño: {m.handoff}
        </p>
      )}
    </motion.div>
  );
}

function OwnerView({
  order,
  alerts,
}: {
  order: { pedido: Order; total: number; estado: string };
  alerts: { text: string; time: string; kind: "aviso" | "pase" | "pago" }[];
}) {
  const p = order.pedido;
  const rows: [string, string][] = [
    ["Cliente", p.cliente],
    ["Prenda", p.producto],
    ["Talle", p.talle],
    ["Cantidad", p.cantidad],
    ["Entrega", p.entrega],
    ["Dirección", p.direccion],
    ["Pago", p.pago],
  ];
  return (
    <div className="flex-1 space-y-6 overflow-y-auto px-5 py-5">
      <div>
        <p className="text-sm text-muted">Estado de la venta</p>
        <motion.p key={order.estado} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="font-display text-3xl uppercase">
          {order.estado}
        </motion.p>
      </div>

      <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 border-y border-line py-4 text-sm">
        {rows.map(([k, v]) => (
          <div key={k} className="contents">
            <dt className="text-muted">{k}</dt>
            <dd className={v ? "font-medium" : "text-muted"}>{v || "Todavía no"}</dd>
          </div>
        ))}
        <dt className="pt-2 font-semibold">Total</dt>
        <dd className="pt-2 font-semibold tabular-nums">{order.total ? formatPrice(order.total) : "-"}</dd>
      </dl>

      <div>
        <p className="mb-3 font-semibold">Avisos a tu WhatsApp</p>
        {alerts.length === 0 ? (
          <p className="text-sm text-muted">Cuando haya una venta lista, un pago o un cliente para atender, te llega acá.</p>
        ) : (
          <ul className="space-y-3">
            <AnimatePresence initial={false}>
              {alerts.map((a, i) => (
                <motion.li
                  key={`${a.time}-${alerts.length - i}`}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="flex gap-3 border border-line p-3 text-sm"
                >
                  {a.kind === "pago" ? (
                    <CheckCircle size={20} weight="fill" className="shrink-0 text-accent" />
                  ) : (
                    <BellRinging size={20} className="shrink-0 text-accent" />
                  )}
                  <span className="flex-1">{a.text}</span>
                  <span className="text-xs text-muted">{a.time}</span>
                </motion.li>
              ))}
            </AnimatePresence>
          </ul>
        )}
      </div>
    </div>
  );
}
