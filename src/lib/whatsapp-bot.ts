// Bot de WhatsApp: recibe los mensajes (API oficial de Meta o Evolution API) y contesta con la IA.
//
// Cómo se comporta:
// - Junta los mensajes que el cliente manda seguidos (espera unos segundos) y contesta una vez.
// - Si el dueño escribe a mano en un chat, el bot se calla en ese chat por 12 horas.
//   El dueño lo reactiva escribiendo #bot en ese chat o desde el panel (/admin/chats).
// - Si el bot pasa la charla al dueño o falla, también se calla en ese chat y le avisa al dueño.
// - Ignora grupos, estados, canales y los números cargados en Ajustes (familia, amigos).
//
// Las charlas se guardan en la base (BotChat) para que el panel las muestre y no se pierdan
// al reiniciar. Lo que es solo de la sesión (mensajes por juntar, timers) vive en memoria.
import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import type { Prisma } from "@prisma/client";
import { askBot, RefusalError, type BotReply, type InMsg } from "./bot";
import { formatPrice, store } from "./config";
import { prisma } from "./db";
import { getMediaBase64 } from "./evolution";
import { markReadTyping } from "./wa-cloud";
import { notifyOwner as notifyOwnerRaw, provider, sendImage, sendText } from "./wa";
import { getIgnoredNumbers, getShop, phoneKey } from "./shop";

const WAIT = 4_000; // espera para juntar mensajes seguidos
const HISTORY = 20; // mensajes que recuerda por charla
const CHAT_TTL = 24 * 60 * 60 * 1000; // después de esto la charla arranca de cero
const PAUSE = 12 * 60 * 60 * 1000; // silencio del bot cuando atiende el dueño
const LIMIT = 40; // mensajes del cliente por hora, para cuidar el gasto de IA
const MAX_IMAGE = 6_500_000; // ~5 MB de imagen en base64, el máximo que acepta la IA

type Chat = {
  history: InMsg[];
  pending: InMsg[];
  timer?: ReturnType<typeof setTimeout>;
  busy: boolean;
  pausedUntil: number;
  lastBotSend: number; // para no confundir los mensajes del bot con los del dueño
  updated: number;
  hits: number;
  hitsReset: number;
  name: string;
  phone: string; // solo dígitos, "" si WhatsApp no lo informa
  handoff: string;
  lastInId: string; // último mensaje del cliente, para marcarlo leído y mostrar "escribiendo..."
};

// Mensaje entrante, igual para la API oficial y para Evolution.
export type Incoming = {
  jid: string; // id del chat (número@s.whatsapp.net)
  id: string; // id del mensaje
  fromMe: boolean; // lo mandó la tienda desde el celular
  phone: string; // solo dígitos, "" si no se sabe
  name?: string;
  text: string;
  kind: "text" | "image" | "audio" | "other";
  image?: {
    base64?: string;
    mimetype?: string;
    load?: () => Promise<{ base64?: string; mimetype?: string }>;
  };
};

// Se guarda en globalThis para que el webhook y el panel compartan el mismo estado.
type State = {
  chats: Map<string, Chat>;
  loading: Map<string, Promise<Chat>>;
  seen: Set<string>;
  botSent: Set<string>;
};
const state = ((globalThis as unknown as { __waBot?: State }).__waBot ??= {
  chats: new Map<string, Chat>(),
  loading: new Map<string, Promise<Chat>>(),
  seen: new Set<string>(), // ids ya procesados (Evolution puede reintentar)
  botSent: new Set<string>(), // ids de mensajes que mandó el bot
});
const { chats, seen, botSent } = state;

function remember(set: Set<string>, id: string) {
  if (set.size > 5000) set.clear();
  set.add(id);
}

async function getChat(jid: string): Promise<Chat> {
  const now = Date.now();
  let chat = chats.get(jid);
  if (!chat) {
    if (chats.size > 2000) {
      for (const [k, c] of chats)
        if (now - c.updated > CHAT_TTL && !c.busy) chats.delete(k);
    }
    // Si llegan dos mensajes juntos de un chat nuevo, los dos esperan la misma carga.
    let loading = state.loading.get(jid);
    if (!loading) {
      loading = loadChat(jid, now).finally(() => state.loading.delete(jid));
      state.loading.set(jid, loading);
    }
    chat = await loading;
  }
  if (now - chat.updated > CHAT_TTL && !chat.busy) chat.history = [];
  chat.updated = now;
  return chat;
}

async function loadChat(jid: string, now: number): Promise<Chat> {
  const row = await prisma.botChat.findUnique({ where: { jid } });
  const chat: Chat = {
    history: row ? (row.history as unknown as InMsg[]) : [],
    pending: [],
    busy: false,
    pausedUntil: row?.pausedUntil?.getTime() ?? 0,
    lastBotSend: 0,
    updated: row?.lastAt.getTime() ?? now,
    hits: 0,
    hitsReset: now + 3_600_000,
    name: row?.name ?? "",
    phone: row?.phone ?? "",
    handoff: row?.handoff ?? "",
    lastInId: "",
  };
  chats.set(jid, chat);
  return chat;
}

// Guarda la charla en la base. Las fotos no se guardan (pesan mucho): quedan como texto.
async function save(jid: string, chat: Chat) {
  const history = chat.history.map((m) =>
    m.image ? { role: m.role, text: m.text || "(mandó una foto)" } : m,
  );
  const data = {
    name: chat.name,
    phone: chat.phone,
    history: history as unknown as Prisma.InputJsonValue,
    pausedUntil:
      chat.pausedUntil > Date.now() ? new Date(chat.pausedUntil) : null,
    handoff: chat.handoff,
    lastAt: new Date(chat.updated),
  };
  try {
    await prisma.botChat.upsert({
      where: { jid },
      update: data,
      create: { jid, ...data },
    });
  } catch (error) {
    console.error("[whatsapp] no se pudo guardar la charla", error);
  }
}

function pause(chat: Chat, reason: string) {
  chat.pausedUntil = Date.now() + PAUSE;
  chat.handoff = reason;
  chat.pending = [];
}

function resume(chat: Chat) {
  chat.pausedUntil = 0;
  chat.handoff = "";
}

// Para el panel: pausa o reactiva el bot en un chat.
export async function setChatPaused(jid: string, paused: boolean) {
  const chat = await getChat(jid);
  if (paused) pause(chat, "Pausado desde el panel");
  else resume(chat);
  await save(jid, chat);
}

const digits = (jid?: string) =>
  jid && jid.endsWith("@s.whatsapp.net") ? jid.split("@")[0].split(":")[0] : "";

// Tipos mínimos del payload de Evolution (messages.upsert).
type WaKey = {
  remoteJid?: string;
  remoteJidAlt?: string;
  fromMe?: boolean;
  id?: string;
};
type WaMessage = {
  conversation?: string;
  extendedTextMessage?: { text?: string };
  imageMessage?: { caption?: string; mimetype?: string };
  videoMessage?: { caption?: string };
  documentMessage?: { caption?: string };
  audioMessage?: unknown;
  base64?: string;
};
export type WaData = {
  key?: WaKey;
  pushName?: string;
  message?: WaMessage;
  messageType?: string;
};

function textOf(m?: WaMessage) {
  return (
    m?.conversation ||
    m?.extendedTextMessage?.text ||
    m?.imageMessage?.caption ||
    m?.videoMessage?.caption ||
    m?.documentMessage?.caption ||
    ""
  ).trim();
}

async function send(to: string, text: string) {
  const id = await sendText(to, text);
  if (id) remember(botSent, id);
}

async function notifyOwner(text: string) {
  const id = await notifyOwnerRaw(text);
  if (id) remember(botSent, id);
}

function clientLine(chat: Chat) {
  const who = chat.name || "Cliente";
  return chat.phone ? `${who} (+${chat.phone}) wa.me/${chat.phone}` : who;
}

function orderSummary(r: BotReply) {
  const p = r.pedido;
  const parts = [
    p.producto &&
      `${p.producto}${p.talle ? ` talle ${p.talle}` : ""}${p.cantidad ? ` x${p.cantidad}` : ""}`,
    p.entrega &&
      `Entrega: ${p.entrega}${p.direccion ? ` (${p.direccion})` : ""}`,
    p.pago && `Pago: ${p.pago}`,
    r.total > 0 && `Total: ${formatPrice(r.total)} sin envío`,
  ].filter(Boolean);
  return parts.join("\n");
}

// Junta los mensajes pendientes del cliente en uno solo (texto unido y la última foto).
function merge(pending: InMsg[]): InMsg {
  const text = pending
    .map((m) => m.text)
    .filter(Boolean)
    .join("\n");
  const image = [...pending].reverse().find((m) => m.image)?.image;
  return image ? { role: "user", text, image } : { role: "user", text };
}

// Recorta la charla: últimos HISTORY mensajes, arrancando por el cliente,
// y solo las 2 fotos más recientes (las viejas pasan a texto para gastar menos).
function trim(history: InMsg[]): InMsg[] {
  let out = history.slice(-HISTORY);
  while (out.length && out[0].role !== "user") out = out.slice(1);
  let images = 0;
  for (let i = out.length - 1; i >= 0; i--) {
    if (out[i].image && ++images > 2)
      out[i] = { role: "user", text: out[i].text || "(mandó una foto)" };
  }
  return out;
}

function schedule(jid: string, chat: Chat) {
  clearTimeout(chat.timer);
  chat.timer = setTimeout(() => void flush(jid), WAIT);
}

async function flush(jid: string) {
  const chat = chats.get(jid);
  if (!chat || chat.busy || chat.pending.length === 0) return;
  if (Date.now() < chat.pausedUntil) {
    chat.pending = [];
    return;
  }

  const to = chat.phone || jid;
  chat.lastBotSend = Date.now();
  const history = trim([...chat.history, merge(chat.pending)]);
  chat.pending = [];
  chat.busy = true;
  if (provider() === "cloud" && chat.lastInId) {
    // Tildes azules + "escribiendo..." mientras piensa la IA.
    markReadTyping(chat.lastInId).catch((error) =>
      console.error("[whatsapp] no se pudo marcar leído", error),
    );
  }
  try {
    const shop = await getShop();
    const r = await askBot(history, "whatsapp", shop);
    if (r.reply) await send(to, r.reply);

    const site = process.env.PUBLIC_SITE_URL?.replace(/\/+$/, "");
    if (site) {
      for (const code of r.productos.slice(0, 2)) {
        const p = shop.products.find((x) => x.id === code);
        if (!p) continue;
        try {
          const id = await sendImage(
            to,
            `${site}${p.image}`,
            `${p.name} · ${formatPrice(p.price)}`,
          );
          if (id) remember(botSent, id);
        } catch (error) {
          console.error("[whatsapp] no se pudo mandar la foto", code, error);
        }
      }
    }

    chat.history = [...history, { role: "assistant", text: r.reply }];

    if (r.pasar_al_dueno) pause(chat, r.motivo || "El bot se lo pasó al dueño");
    if (r.aviso_dueno || r.pasar_al_dueno || r.mandar_link_pago) {
      const lines = [
        `Aviso del bot de ${store.name}`,
        clientLine(chat),
        r.aviso_dueno,
        r.mandar_link_pago &&
          "Listo para pagar: mandale el link de pago o los datos para transferir.",
        r.pasar_al_dueno &&
          `Te lo pasé a vos${r.motivo ? `: ${r.motivo}` : ""}. El bot no responde en ese chat por 12 h. Para reactivarlo, escribí #bot en ese chat o usá el panel.`,
        orderSummary(r),
      ].filter(Boolean);
      await notifyOwner(lines.join("\n"));
    }
  } catch (error) {
    console.error("[whatsapp] error del bot", error);
    // Si la IA falla, el cliente no queda sin respuesta: lo atiende el dueño.
    const reason =
      error instanceof RefusalError
        ? "el bot no pudo responder ese mensaje"
        : error instanceof Anthropic.APIError
          ? `error de la IA (${error.status})`
          : "error del bot";
    pause(chat, `El bot falló: ${reason}`);
    try {
      await send(
        to,
        "Perdoná, se me complicó para responderte. En un ratito te contesta el dueño.",
      );
    } catch (sendError) {
      console.error(
        "[whatsapp] no se pudo mandar el aviso al cliente",
        sendError,
      );
    }
    await notifyOwner(
      `Aviso del bot de ${store.name}\n${clientLine(chat)}\nNo pude responderle (${reason}). Atendelo vos. Para reactivar el bot, escribí #bot en ese chat o usá el panel.`,
    );
  } finally {
    chat.busy = false;
    chat.lastBotSend = Date.now();
    await save(jid, chat);
    if (chat.pending.length) schedule(jid, chat);
  }
}

// Adaptador de Evolution API (evento messages.upsert).
export async function handleMessage(d: WaData) {
  const key = d.key;
  const jid = key?.remoteJid;
  if (!key || !jid || !key.id) return;
  if (
    jid.endsWith("@g.us") ||
    jid.endsWith("@broadcast") ||
    jid.endsWith("@newsletter")
  )
    return;
  const m = d.message;
  const id = key.id;
  await handleIncoming({
    jid,
    id,
    fromMe: Boolean(key.fromMe),
    phone: digits(jid) || digits(key.remoteJidAlt),
    name: d.pushName,
    text: textOf(m),
    kind: m?.imageMessage
      ? "image"
      : m?.audioMessage
        ? "audio"
        : textOf(m)
          ? "text"
          : "other",
    image: m?.imageMessage
      ? {
          base64: m.base64,
          mimetype: m.imageMessage.mimetype,
          load: () => getMediaBase64(id),
        }
      : undefined,
  });
}

export async function handleIncoming(m: Incoming) {
  const { jid, phone, text } = m;
  if (seen.has(m.id)) return;
  remember(seen, m.id);

  const owner = process.env.OWNER_WHATSAPP?.replace(/\D/g, "");
  if (owner && phone === owner) return; // charla con el dueño: el bot no se mete
  if (phone && (await getIgnoredNumbers()).includes(phoneKey(phone))) return; // contacto personal

  const chat = await getChat(jid);
  if (phone) chat.phone = phone;

  if (m.fromMe) {
    // Escribió el dueño desde el celular de la tienda.
    if (text.toLowerCase() === "#bot") {
      resume(chat);
      chat.history = [];
      await save(jid, chat);
      return;
    }
    // Los mensajes del bot pueden volver como propios: se reconocen por id. En Evolution
    // también por llegar mientras el bot responde (ahí el id puede llegar después).
    // La API oficial solo avisa lo que el dueño manda desde la app, así que no hace falta.
    if (botSent.has(m.id)) return;
    if (
      provider() === "evolution" &&
      (chat.busy || Date.now() - chat.lastBotSend < 15_000)
    )
      return;
    pause(chat, "Lo atendió el dueño");
    await save(jid, chat);
    return;
  }

  if (m.name) chat.name = m.name;
  if (Date.now() < chat.pausedUntil) return;

  const now = Date.now();
  if (now > chat.hitsReset) {
    chat.hits = 0;
    chat.hitsReset = now + 3_600_000;
  }
  if (++chat.hits > LIMIT) return;
  chat.lastInId = m.id;

  if (m.kind === "image") {
    let base64 = m.image?.base64;
    let mimetype = m.image?.mimetype;
    if (!base64 && m.image?.load) {
      try {
        const media = await m.image.load();
        base64 = media.base64;
        mimetype = media.mimetype || mimetype;
      } catch (error) {
        console.error("[whatsapp] no se pudo bajar la foto", error);
      }
    }
    const type = (mimetype || "image/jpeg").split(";")[0].trim();
    if (
      base64 &&
      base64.length <= MAX_IMAGE &&
      /^image\/(jpeg|png|webp|gif)$/.test(type)
    ) {
      chat.pending.push({
        role: "user",
        text,
        image: `data:${type};base64,${base64}`,
      });
    } else {
      chat.pending.push({
        role: "user",
        text: text || "(mandó una foto que no se pudo ver)",
      });
    }
  } else if (m.kind === "audio") {
    chat.lastBotSend = Date.now();
    try {
      await send(
        chat.phone || jid,
        "Por ahora no puedo escuchar audios. ¿Me lo escribís?",
      );
    } catch (error) {
      console.error("[whatsapp] no se pudo responder el audio", error);
    }
    return;
  } else if (text) {
    chat.pending.push({ role: "user", text: text.slice(0, 2000) });
  } else {
    return; // stickers, reacciones, ubicaciones, etc.
  }

  schedule(jid, chat);
}
