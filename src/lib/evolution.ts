// Cliente mínimo de Evolution API v2 (WhatsApp). Usa estas variables de entorno:
// EVOLUTION_URL (ej: https://evo.midominio.com), EVOLUTION_API_KEY y EVOLUTION_INSTANCE.

function config() {
  const url = process.env.EVOLUTION_URL?.replace(/\/+$/, "");
  const key = process.env.EVOLUTION_API_KEY;
  const instance = process.env.EVOLUTION_INSTANCE;
  if (!url || !key || !instance) throw new Error("Faltan EVOLUTION_URL, EVOLUTION_API_KEY o EVOLUTION_INSTANCE");
  return { url, key, instance };
}

async function call<T>(path: string, body: unknown): Promise<T> {
  const { url, key, instance } = config();
  const res = await fetch(`${url}${path}/${encodeURIComponent(instance)}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", apikey: key },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(30_000),
  });
  if (!res.ok) throw new Error(`Evolution ${path} respondió ${res.status}: ${(await res.text()).slice(0, 300)}`);
  return (await res.json()) as T;
}

type Sent = { key?: { id?: string } };

function typingDelay(text: string) {
  return Math.min(5000, Math.max(2000, 1500 + text.length * 20));
}

// `to` acepta el número con código de país o el JID completo del chat.
// `delay` muestra "escribiendo..." esos milisegundos antes de mandar. Por defecto depende del largo
// del texto (entre 2 y 5 s), como una persona: responder al instante delata al bot.
export async function sendText(to: string, text: string, delay = typingDelay(text)) {
  const res = await call<Sent>("/message/sendText", { number: to, text, delay });
  return res.key?.id;
}

export async function sendImage(to: string, imageUrl: string, caption: string) {
  // Las fotos subidas desde el panel son WebP: se piden en JPG para que WhatsApp no las tome como sticker.
  const url = imageUrl.endsWith(".webp") ? `${imageUrl}?jpg=1` : imageUrl;
  const base = (imageUrl.split("/").pop() || "foto").replace(/\.webp$/, ".jpg");
  const mimetype = base.endsWith(".png") ? "image/png" : "image/jpeg";
  const res = await call<Sent>("/message/sendMedia", { number: to, mediatype: "image", mimetype, caption, media: url, fileName: base, delay: 1500 });
  return res.key?.id;
}

// Baja la foto que mandó el cliente. Solo hace falta si el webhook no viene con base64.
export async function getMediaBase64(messageId: string) {
  return call<{ base64?: string; mimetype?: string }>("/chat/getBase64FromMediaMessage", {
    message: { key: { id: messageId } },
    convertToMp4: false,
  });
}
