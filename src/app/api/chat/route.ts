// Chat del asistente con IA real. Recibe la charla y devuelve la respuesta más la ficha del
// pedido. La API key vive solo en el servidor (ANTHROPIC_API_KEY), nunca llega al navegador.
import Anthropic from "@anthropic-ai/sdk";
import { SYSTEM_PROMPT } from "@/lib/bot-prompt";
import { products } from "@/lib/products";

export const runtime = "nodejs";

const client = new Anthropic();

const S = { type: "string" } as const;
const SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["reply", "productos", "pedido", "total", "estado", "mandar_link_pago", "pasar_al_dueno", "motivo", "aviso_dueno"],
  properties: {
    reply: S,
    productos: { type: "array", items: { type: "string", enum: products.map((p) => p.id) } },
    pedido: {
      type: "object",
      additionalProperties: false,
      required: ["cliente", "codigo", "producto", "talle", "cantidad", "entrega", "direccion", "pago"],
      properties: {
        cliente: S,
        codigo: { type: "string", enum: [...products.map((p) => p.id), ""] },
        producto: S,
        talle: S,
        cantidad: S,
        entrega: S,
        direccion: S,
        pago: S,
      },
    },
    total: { type: "integer" },
    estado: { type: "string", enum: ["Consultando", "Interesado", "Lo está pensando", "Listo para pagar", "No le interesa"] },
    mandar_link_pago: { type: "boolean" },
    pasar_al_dueno: { type: "boolean" },
    motivo: S,
    aviso_dueno: S,
  },
};

type InMsg = {
  role: "user" | "assistant";
  text: string;
  image?: string; // data URL JPEG, solo en mensajes del cliente
};

const MAX_IMAGE = 900_000; // ~650 KB de imagen en base64

function toApi(msgs: InMsg[]): Anthropic.Beta.BetaMessageParam[] {
  return msgs.map((m) => {
    if (m.role === "user" && m.image) {
      const data = m.image.replace(/^data:image\/jpeg;base64,/, "");
      return {
        role: "user",
        content: [
          { type: "image", source: { type: "base64", media_type: "image/jpeg", data } },
          { type: "text", text: m.text || "(mandó esta foto)" },
        ],
      };
    }
    return { role: m.role, content: m.text };
  });
}

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

export async function POST(req: Request) {
  let body: { messages?: unknown };
  try {
    body = await req.json();
  } catch {
    return json({ error: "JSON inválido" }, 400);
  }
  if (!valid(body.messages)) return json({ error: "Conversación inválida o demasiado larga" }, 400);

  try {
    const response = await client.beta.messages.create({
      model: "claude-opus-5-5",
      max_tokens: 4000,
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      output_config: { effort: "low", format: { type: "json_schema", schema: SCHEMA } },
      cache_control: { type: "ephemeral" },
      system: SYSTEM_PROMPT,
      messages: toApi(body.messages),
    });
    if (response.stop_reason === "refusal") return json({ error: "El asistente no pudo responder eso" }, 422);
    const text = response.content.flatMap((b) => (b.type === "text" ? [b.text] : [])).join("");
    return json(JSON.parse(text));
  } catch (error) {
    if (error instanceof Anthropic.RateLimitError) return json({ error: "Muchas consultas juntas, probá en un ratito" }, 429);
    if (error instanceof Anthropic.AuthenticationError) return json({ error: "Falta configurar la clave de la IA" }, 503);
    if (error instanceof Anthropic.APIError) return json({ error: `Error del servicio de IA (${error.status})` }, 502);
    if (error instanceof SyntaxError) return json({ error: "Respuesta inválida del asistente" }, 502);
    throw error;
  }
}
