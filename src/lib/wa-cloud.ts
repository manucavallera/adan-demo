// Cliente mínimo de la API oficial de WhatsApp (Cloud API de Meta). Usa estas variables de entorno:
// WHATSAPP_TOKEN (token de acceso permanente), WHATSAPP_PHONE_NUMBER_ID y, opcional,
// WHATSAPP_GRAPH_VERSION (por defecto v26.0).
import "server-only";

export class CloudApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code?: number,
  ) {
    super(message);
  }
}

// 131047: pasaron más de 24 h desde el último mensaje de esa persona; solo se puede mandar una plantilla.
export const OUTSIDE_WINDOW = 131047;

function config() {
  const token = process.env.WHATSAPP_TOKEN;
  const phoneId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const version = process.env.WHATSAPP_GRAPH_VERSION || "v26.0";
  if (!token || !phoneId) throw new Error("Faltan WHATSAPP_TOKEN o WHATSAPP_PHONE_NUMBER_ID");
  // WHATSAPP_GRAPH_URL solo se cambia para pruebas locales.
  const host = (process.env.WHATSAPP_GRAPH_URL || "https://graph.facebook.com").replace(/\/+$/, "");
  return { token, phoneId, base: `${host}/${version}` };
}

export function cloudConfigured() {
  return Boolean(process.env.WHATSAPP_TOKEN && process.env.WHATSAPP_PHONE_NUMBER_ID);
}

async function post<T>(body: Record<string, unknown>): Promise<T> {
  const { token, phoneId, base } = config();
  const res = await fetch(`${base}/${phoneId}/messages`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ messaging_product: "whatsapp", ...body }),
    signal: AbortSignal.timeout(30_000),
  });
  const data = (await res.json().catch(() => ({}))) as T & { error?: { message?: string; code?: number } };
  if (!res.ok || data.error) {
    const e = data.error;
    throw new CloudApiError(`WhatsApp respondió ${res.status}: ${e?.message ?? ""}`.slice(0, 300), res.status, e?.code);
  }
  return data;
}

type Sent = { messages?: { id?: string }[] };
const idOf = (r: Sent) => r.messages?.[0]?.id;

export async function sendText(to: string, text: string) {
  return idOf(await post<Sent>({ to, type: "text", text: { body: text.slice(0, 4096), preview_url: true } }));
}

// WhatsApp acepta solo JPG o PNG: las fotos WebP del panel se piden en JPG.
export async function sendImage(to: string, imageUrl: string, caption: string) {
  const link = imageUrl.endsWith(".webp") ? `${imageUrl}?jpg=1` : imageUrl;
  return idOf(await post<Sent>({ to, type: "image", image: { link, caption } }));
}

// Plantilla aprobada con un solo parámetro en el cuerpo. Sirve para avisar al dueño fuera de las 24 h.
// Los parámetros no aceptan saltos de línea.
export async function sendTemplate(to: string, name: string, lang: string, param: string) {
  const text = param.replace(/\s*\n\s*/g, " · ").replace(/\s{4,}/g, " ").slice(0, 1000);
  return idOf(
    await post<Sent>({
      to,
      type: "template",
      template: { name, language: { code: lang }, components: [{ type: "body", parameters: [{ type: "text", text }] }] },
    }),
  );
}

// Marca el mensaje como leído (tildes azules) y muestra "escribiendo..." hasta que llega la
// respuesta o pasan 25 segundos.
export async function markReadTyping(messageId: string) {
  await post({ status: "read", message_id: messageId, typing_indicator: { type: "text" } });
}

// Baja una foto que mandó el cliente: primero se pide la URL temporal y después el archivo.
export async function downloadMedia(mediaId: string) {
  const { token, base } = config();
  const auth = { Authorization: `Bearer ${token}` };
  const meta = await fetch(`${base}/${mediaId}`, { headers: auth, signal: AbortSignal.timeout(15_000) });
  if (!meta.ok) throw new CloudApiError(`No se pudo pedir la foto (${meta.status})`, meta.status);
  const { url, mime_type } = (await meta.json()) as { url?: string; mime_type?: string };
  if (!url) throw new CloudApiError("La foto no tiene URL", 404);
  const file = await fetch(url, { headers: auth, signal: AbortSignal.timeout(30_000) });
  if (!file.ok) throw new CloudApiError(`No se pudo bajar la foto (${file.status})`, file.status);
  const base64 = Buffer.from(await file.arrayBuffer()).toString("base64");
  return { base64, mimetype: mime_type || file.headers.get("content-type") || "image/jpeg" };
}
