// Chat del asistente de la web. Recibe la charla y devuelve la respuesta más la ficha del
// pedido. La llamada a la IA está en src/lib/bot.ts y la comparte con WhatsApp.
import Anthropic from "@anthropic-ai/sdk";
import { askBot, RefusalError, type InMsg } from "@/lib/bot";
import { getShop } from "@/lib/shop";

export const runtime = "nodejs";

const MAX_IMAGE = 900_000; // ~650 KB de imagen en base64

function valid(msgs: unknown): msgs is InMsg[] {
  if (!Array.isArray(msgs) || msgs.length === 0 || msgs.length > 40) return false;
  if (msgs[0]?.role !== "user" || msgs[msgs.length - 1]?.role !== "user") return false;
  let images = 0;
  return msgs.every((m) => {
    if (!m || (m.role !== "user" && m.role !== "assistant")) return false;
    if (typeof m.text !== "string" || m.text.length > 800) return false;
    if (m.image !== undefined) {
      images++;
      if (m.role !== "user" || typeof m.image !== "string" || !m.image.startsWith("data:image/jpeg;base64,") || m.image.length > MAX_IMAGE) return false;
    } else if (!m.text) return false;
    return images <= 3;
  });
}

const json = (body: unknown, status = 200) => Response.json(body, { status });

// Freno simple para la demo pública: máximo de mensajes por IP por hora.
// Vive en memoria, así que es por instancia del servidor; alcanza para evitar abusos.
const LIMIT = 30;
const WINDOW = 60 * 60 * 1000;
const hits = new Map<string, { count: number; reset: number }>();

function limited(req: Request) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0].trim() || req.headers.get("x-real-ip") || "local";
  const now = Date.now();
  const entry = hits.get(ip);
  if (!entry || now > entry.reset) {
    if (hits.size > 5000) hits.clear();
    hits.set(ip, { count: 1, reset: now + WINDOW });
    return false;
  }
  entry.count++;
  return entry.count > LIMIT;
}

export async function POST(req: Request) {
  if (limited(req)) return json({ error: "Llegaste al límite de mensajes de la demo, probá en un rato" }, 429);
  let body: { messages?: unknown };
  try {
    body = await req.json();
  } catch {
    return json({ error: "JSON inválido" }, 400);
  }
  if (!valid(body.messages)) return json({ error: "Conversación inválida o demasiado larga" }, 400);

  try {
    return json(await askBot(body.messages, "web", await getShop()));
  } catch (error) {
    if (error instanceof RefusalError) return json({ error: "El asistente no pudo responder eso" }, 422);
    if (error instanceof Anthropic.RateLimitError) return json({ error: "Muchas consultas juntas, probá en un ratito" }, 429);
    if (error instanceof Anthropic.AuthenticationError) return json({ error: "Falta configurar la clave de la IA" }, 503);
    if (error instanceof Anthropic.APIError) return json({ error: `Error del servicio de IA (${error.status})` }, 502);
    if (error instanceof SyntaxError) return json({ error: "Respuesta inválida del asistente" }, 502);
    throw error;
  }
}
