"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
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
  Package,
  ChartBar,
} from "@phosphor-icons/react";
import { sizesOf, type Product } from "@/lib/products";
import { useShop } from "./shop";
import { formatPrice, store, waLink } from "@/lib/config";
import { toJpeg } from "@/lib/to-jpeg";

// Demo del asistente de WhatsApp. Se ve como un chat y por detrás usa la IA real (/api/chat).
// La pestaña "Vista del dueño" muestra lo que le llegaría al dueño: ficha del pedido y avisos.

type Order = {
  cliente: string;
  codigo: string;
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

// Sugerencias del chat real: no dependen de códigos ni prendas puntuales.
const SUGGESTIONS_REAL = [
  "Tengo un casamiento, ¿qué me pongo?",
  "Mido 1,78 y peso 82, ¿qué talle de pantalón soy?",
  "¿Hacen envíos? ¿Cuánto sale?",
  "¿Qué formas de pago tienen?",
];

const SUGGESTIONS = [
  "¿Tenés el pantalón de vestir en 44?",
  "Tengo un casamiento, ¿qué me pongo?",
  "Hola! Quiero BER-001 talle 44",
  "Mido 1,78 y peso 82, ¿qué talle de pantalón soy?",
  "¿Me hacés 30% de descuento?",
];

type Stock = Record<string, Record<string, number>>;
type Alert = { text: string; time: string; kind: "aviso" | "pase" | "pago" | "stock" };

const START_STOCK = (products: Product[]): Stock => Object.fromEntries(products.map((p) => [p.id, { ...p.stock }]));

// Lo que ya pasó "hoy" antes de esta charla. Son números de ejemplo para que el resumen se vea
// como el de un día normal; lo que hace el visitante en la demo se suma arriba.
const DAY_BASE = { ventas: 3, monto: 104_700, consultas: 14, pasados: 1 };

const EMPTY_ORDER: Order = { cliente: "", codigo: "", producto: "", talle: "", cantidad: "", entrega: "", direccion: "", pago: "" };
const now = () => new Date().toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" });

export function openBot(text?: string) {
  window.dispatchEvent(new CustomEvent("open-bot", { detail: text }));
}

// demo=true: pestaña del dueño y pago simulado (para mostrar). demo=false: chat real de la tienda.
export function BotDemo({ demo }: { demo: boolean }) {
  const { products, settings } = useShop();
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
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [paid, setPaid] = useState(false);
  const [stock, setStock] = useState<Stock>(() => START_STOCK(products));
  const [sold, setSold] = useState<{ id: string; size: string } | null>(null);
  const scroller = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const busy = useRef(false);
  // En la ficha y el checkout ya hay botón de WhatsApp: en celu no hace falta el flotante.
  const pathname = usePathname();
  const hideOnMobile = pathname.startsWith("/producto/") || pathname.startsWith("/checkout");

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
    setStock(START_STOCK(products));
    setSold(null);
  }

  function pay(total: number) {
    if (paid) return;
    setPaid(true);
    const t = now();
    setMsgs((m) => [...m, { role: "assistant", text: `Listo, nos llegó tu pago de ${formatPrice(total)}. Gracias! Te avisamos por acá cuando sale.`, time: t }]);
    setOrder((o) => ({ ...o, estado: "Pagado" }));

    // Descuenta el stock de lo vendido y avisa si quedó poco.
    const { codigo, talle, cantidad } = order.pedido;
    const p = products.find((x) => x.id === codigo);
    const news: Alert[] = [];
    if (p && talle in stock[p.id]) {
      const qty = Math.max(1, parseInt(cantidad, 10) || 1);
      const left = Math.max(0, stock[p.id][talle] - qty);
      setStock((s) => ({ ...s, [p.id]: { ...s[p.id], [talle]: left } }));
      setSold({ id: p.id, size: talle });
      if (left === 0) news.push({ text: `Se agotó ${p.name} talle ${talle}. ¿Reponés?`, time: t, kind: "stock" });
      else if (left <= 2) news.push({ text: `Stock bajo: ${left === 1 ? "queda 1" : `quedan ${left}`} de ${p.name} talle ${talle}.`, time: t, kind: "stock" });
    }
    const where = p ? ` ${p.name}${talle ? ` talle ${talle}` : ""}.` : "";
    setAlerts((a) => [...news, { text: `Pago aprobado por ${formatPrice(total)}.${where} El stock ya se descontó.`, time: t, kind: "pago" }, ...a]);
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
            aria-label={demo ? "Probá el asistente" : "Chateá con nosotros"}
            className={`fixed right-4 bottom-4 z-30 h-14 w-14 cursor-pointer items-center justify-center gap-2 rounded-full bg-accent font-semibold text-on-accent shadow-[0_12px_32px_-8px_rgba(30,25,21,0.45)] md:right-8 md:bottom-8 md:flex md:w-auto md:rounded-none md:pr-5 md:pl-4 ${hideOnMobile ? "hidden" : "flex"}`}
          >
            <ChatCircleText size={26} weight="fill" />
            <span className="hidden md:inline">{demo ? "Probá el asistente" : "¿Te ayudo?"}</span>
          </motion.button>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {open && (
          <motion.section
            role="dialog"
            aria-label={demo ? "Demo del asistente de WhatsApp" : "Chat de la tienda"}
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

            {demo && (
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
            )}

            {!demo || tab === "chat" ? (
              <>
                <div ref={scroller} className="flex-1 space-y-2 overflow-y-auto bg-[#efeae2] px-3 py-4 dark:bg-[#0b141a]">
                  <p className="mx-auto w-fit bg-[#fff6c5] px-3 py-1.5 text-center text-xs text-[#54656f] dark:bg-[#182229] dark:text-[#ffd279]">
                    {demo ? "Demo con IA real. Escribí como si fueras un cliente." : "Asistente virtual. Te ayuda a elegir prenda y talle."}
                  </p>
                  {msgs.length === 0 && (
                    <div className="space-y-2 pt-4">
                      {(demo ? SUGGESTIONS : SUGGESTIONS_REAL).map((s) => (
                        <button key={s} type="button" onClick={() => send(s)} className="block w-fit cursor-pointer border border-[#d1d7db] bg-white px-3 py-2 text-left text-sm text-[#111b21] transition-transform active:scale-[0.98] dark:border-[#2a3942] dark:bg-[#202c33] dark:text-[#e9edef]">
                          {s}
                        </button>
                      ))}
                      {demo && <button
                        type="button"
                        onClick={async () => send("Hola, ¿cuánto sale esta?", await toJpeg("/img/adan/estado-ejemplo.jpg"))}
                        className="flex w-fit cursor-pointer items-center gap-2 border border-[#d1d7db] bg-white px-3 py-2 text-sm text-[#111b21] transition-transform active:scale-[0.98] dark:border-[#2a3942] dark:bg-[#202c33] dark:text-[#e9edef]"
                      >
                        <Camera size={16} /> Mandar captura de un estado
                      </button>}
                    </div>
                  )}
                  {msgs.map((m, i) => (
                    <Bubble key={i} m={m} paid={paid} onPay={pay} demo={demo} wa={waLink(settings.whatsapp, "Hola! Vengo del chat de la web")} />
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
              <OwnerView order={order} alerts={alerts} stock={stock} sold={sold} msgs={msgs} paid={paid} />
            )}
          </motion.section>
        )}
      </AnimatePresence>
    </>
  );
}

function Bubble({ m, paid, onPay, demo, wa }: { m: Msg; paid: boolean; onPay: (total: number) => void; demo: boolean; wa: string }) {
  const { products, settings } = useShop();
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

      {demo && m.pay !== undefined && (
        <div className="w-64 max-w-[85%] bg-white p-3 text-[#111b21] shadow-sm dark:bg-[#202c33] dark:text-[#e9edef]">
          <p className="text-xs text-[#667781] dark:text-[#8696a0]">mercadopago.com.ar</p>
          <p className="font-semibold">Pagá tu pedido de {store.name}</p>
          <p className="text-sm">
            {formatPrice(m.pay)}{settings.installments && ` · ${settings.installments}`}
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

      {m.handoff && !demo && (
        <a href={wa} target="_blank" rel="noopener noreferrer" className="w-fit bg-[#00a884] px-4 py-2 text-sm font-semibold text-white">
          Seguir por WhatsApp
        </a>
      )}

      {m.handoff && demo && (
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
  stock,
  sold,
  msgs,
  paid,
}: {
  order: { pedido: Order; total: number; estado: string };
  alerts: Alert[];
  stock: Stock;
  sold: { id: string; size: string } | null;
  msgs: Msg[];
  paid: boolean;
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
  const idle = msgs.length === 0;
  const summary = <DaySummary stock={stock} msgs={msgs} paid={paid} total={order.total} handoffs={alerts.filter((a) => a.kind === "pase").length} />;
  const stockList = <StockList stock={stock} sold={sold} />;
  return (
    <div className="flex-1 space-y-6 overflow-y-auto px-5 py-5">
      {idle && (
        <>
          <p className="border border-line bg-surface p-3 text-sm text-muted">
            Así ves tu negocio desde el celular. Escribí en «Lo que ve el cliente» y mirá cómo se arma el pedido acá.
          </p>
          {summary}
          {stockList}
        </>
      )}
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
                  ) : a.kind === "stock" ? (
                    <Package size={20} weight="fill" className="shrink-0 text-accent" />
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

      {!idle && (
        <>
          {summary}
          {stockList}
        </>
      )}
    </div>
  );
}

// Resumen que le llegaría al dueño por WhatsApp todas las noches.
function DaySummary({ stock, msgs, paid, total, handoffs }: { stock: Stock; msgs: Msg[]; paid: boolean; total: number; handoffs: number }) {
  const { products } = useShop();
  const ventas = DAY_BASE.ventas + (paid ? 1 : 0);
  const monto = DAY_BASE.monto + (paid ? total : 0);
  const consultas = DAY_BASE.consultas + (msgs.some((m) => m.role === "user") ? 1 : 0);
  const pasados = DAY_BASE.pasados + handoffs;

  // Lo más consultado en esta charla; si todavía no hay nada, el del día de ejemplo.
  const counts = new Map<string, number>();
  msgs.forEach((m) => m.productos?.forEach((id) => counts.set(id, (counts.get(id) ?? 0) + 1)));
  const topId = [...counts].sort((a, b) => b[1] - a[1])[0]?.[0] ?? "PAN-001";
  const top = products.find((p) => p.id === topId) ?? products[0];

  const low = products.flatMap((p) =>
    sizesOf(p)
      .filter((s) => (stock[p.id]?.[s] ?? 0) <= 1)
      .map((s) => `${p.name} ${s === "Único" ? "" : `talle ${s} `}(${stock[p.id][s] === 0 ? "agotado" : "queda 1"})`),
  );

  return (
    <div>
      <p className="mb-3 flex items-center gap-2 font-semibold">
        <ChartBar size={20} className="text-accent" /> Resumen del día
      </p>
      <div className="bg-[#efeae2] p-3 dark:bg-[#0b141a]">
        <div className="max-w-[92%] bg-white px-3 pt-2 pb-1 text-[14px] leading-snug text-[#111b21] shadow-sm dark:bg-[#202c33] dark:text-[#e9edef]">
          <p className="font-semibold">Resumen de hoy en {store.name}</p>
          <ul className="mt-1 space-y-0.5">
            <li>
              Ventas: <b className="tabular-nums">{ventas}</b> por <b className="tabular-nums">{formatPrice(monto)}</b>
            </li>
            <li>
              Clientes atendidos por el asistente: <b className="tabular-nums">{consultas}</b>
            </li>
            <li>
              Te pasé <b className="tabular-nums">{pasados}</b> {pasados === 1 ? "cliente" : "clientes"} para atender vos
            </li>
            <li>
              Lo más consultado: <b>{top.name}</b>
            </li>
          </ul>
          {low.length > 0 && (
            <>
              <p className="mt-2 font-semibold">Para reponer</p>
              <ul className="space-y-0.5">
                {low.slice(0, 4).map((l) => (
                  <li key={l}>- {l}</li>
                ))}
              </ul>
            </>
          )}
          <p className="mt-0.5 text-right text-[11px] text-[#667781] dark:text-[#8696a0]">21:00</p>
        </div>
      </div>
      <p className="mt-2 text-xs text-muted">Te llega todas las noches. Los números de antes de esta charla son de ejemplo.</p>
    </div>
  );
}

// Stock por talle. Se descuenta solo con cada venta, de la web o del WhatsApp.
function StockList({ stock, sold }: { stock: Stock; sold: { id: string; size: string } | null }) {
  const { products } = useShop();
  return (
    <div>
      <p className="mb-1 flex items-center gap-2 font-semibold">
        <Package size={20} className="text-accent" /> Stock
      </p>
      <p className="mb-3 text-xs text-muted">Se descuenta solo con cada venta. En marrón, lo que está por agotarse.</p>
      <ul className="divide-y divide-line border-y border-line text-sm">
        {products.map((p) => (
          <li key={p.id} className="flex items-center justify-between gap-3 py-2">
            <span className="min-w-0 truncate">{p.name}</span>
            <span className="flex shrink-0 gap-1">
              {sizesOf(p).map((s) => {
                const n = stock[p.id]?.[s] ?? 0;
                const hit = sold?.id === p.id && sold.size === s;
                return (
                  <motion.span
                    key={`${s}-${n}`}
                    initial={hit ? { scale: 1.4 } : false}
                    animate={{ scale: 1 }}
                    title={`Talle ${s}`}
                    className={`inline-flex h-7 min-w-9 items-center justify-center px-1 text-xs tabular-nums ${
                      n === 0 ? "bg-line text-muted line-through" : n <= 2 ? "bg-accent text-on-accent" : "border border-line"
                    } ${hit ? "ring-2 ring-ink" : ""}`}
                  >
                    {s === "Único" ? "U" : s}·{n}
                  </motion.span>
                );
              })}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
