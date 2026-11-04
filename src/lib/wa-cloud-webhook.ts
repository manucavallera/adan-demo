// Traduce el webhook de la API oficial de WhatsApp al formato del bot (Incoming).
// Campos que hay que suscribir en Meta: "messages" y, con coexistencia, "smb_message_echoes"
// (los mensajes que el dueño manda desde la app de WhatsApp Business).
import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import type { Incoming } from "./whatsapp-bot";
import { downloadMedia } from "./wa-cloud";

type CloudMessage = {
  from?: string;
  to?: string;
  id?: string;
  type?: string;
  text?: { body?: string };
  image?: { id?: string; mime_type?: string; caption?: string };
  button?: { text?: string };
  interactive?: { button_reply?: { title?: string }; list_reply?: { title?: string } };
};
type CloudValue = {
  metadata?: { phone_number_id?: string };
  contacts?: { wa_id?: string; profile?: { name?: string } }[];
  messages?: CloudMessage[];
  message_echoes?: CloudMessage[];
};
export type CloudWebhook = {
  object?: string;
  entry?: { changes?: { field?: string; value?: CloudValue }[] }[];
};

// Meta firma cada aviso con la "clave secreta de la app" (X-Hub-Signature-256: sha256=<hex>).
export function validSignature(raw: string, header: string | null, secret: string) {
  if (!header?.startsWith("sha256=")) return false;
  const expected = createHmac("sha256", secret).update(raw).digest();
  const got = Buffer.from(header.slice(7), "hex");
  return got.length === expected.length && timingSafeEqual(got, expected);
}

function textOf(m: CloudMessage) {
  return (
    m.text?.body ||
    m.image?.caption ||
    m.button?.text ||
    m.interactive?.button_reply?.title ||
    m.interactive?.list_reply?.title ||
    ""
  ).trim();
}

function toIncoming(m: CloudMessage, fromMe: boolean, name?: string): Incoming | null {
  const phone = ((fromMe ? m.to : m.from) || "").replace(/\D/g, "");
  if (!phone || !m.id) return null;
  const text = textOf(m);
  const mediaId = m.image?.id;
  return {
    jid: `${phone}@s.whatsapp.net`,
    id: m.id,
    fromMe,
    phone,
    name,
    text,
    kind: m.type === "image" ? "image" : m.type === "audio" ? "audio" : text ? "text" : "other",
    image:
      m.type === "image" && mediaId
        ? { mimetype: m.image?.mime_type, load: () => downloadMedia(mediaId) }
        : undefined,
  };
}

export function parseCloudWebhook(body: CloudWebhook): Incoming[] {
  const phoneId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const out: Incoming[] = [];
  for (const entry of body.entry ?? []) {
    for (const change of entry.changes ?? []) {
      const v = change.value;
      if (!v || (phoneId && v.metadata?.phone_number_id && v.metadata.phone_number_id !== phoneId)) continue;
      if (change.field === "messages") {
        const names = new Map((v.contacts ?? []).map((c) => [c.wa_id, c.profile?.name]));
        for (const m of v.messages ?? []) {
          const inc = toIncoming(m, false, names.get(m.from));
          if (inc) out.push(inc);
        }
      } else if (change.field === "smb_message_echoes") {
        for (const m of v.message_echoes ?? []) {
          const inc = toIncoming(m, true);
          if (inc) out.push(inc);
        }
      }
    }
  }
  return out;
}
