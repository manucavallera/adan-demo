// Llamada a la IA compartida entre el chat de la web (/api/chat) y WhatsApp (/api/whatsapp).
// La API key vive solo en el servidor (ANTHROPIC_API_KEY), nunca llega al navegador.
import Anthropic from "@anthropic-ai/sdk";
import { buildPrompt, type Channel } from "./bot-prompt";
import type { Product } from "./products";
import type { Settings } from "./config";

const client = new Anthropic();

const S = { type: "string" } as const;
function schemaFor(products: Product[]) {
  const ids = products.map((p) => p.id);
  return {
    type: "object",
    additionalProperties: false,
    required: [
      "reply",
      "productos",
      "pedido",
      "total",
      "estado",
      "mandar_link_pago",
      "pasar_al_dueno",
      "motivo",
      "aviso_dueno",
    ],
    properties: {
      reply: S,
      productos: { type: "array", items: { type: "string", enum: ids } },
      pedido: {
        type: "object",
        additionalProperties: false,
        required: [
          "cliente",
          "codigo",
          "producto",
          "talle",
          "cantidad",
          "entrega",
          "direccion",
          "pago",
        ],
        properties: {
          cliente: S,
          codigo: { type: "string", enum: [...ids, ""] },
          producto: S,
          talle: S,
          cantidad: S,
          entrega: S,
          direccion: S,
          pago: S,
        },
      },
      total: { type: "integer" },
      estado: {
        type: "string",
        enum: [
          "Consultando",
          "Interesado",
          "Lo está pensando",
          "Listo para pagar",
          "No le interesa",
        ],
      },
      mandar_link_pago: { type: "boolean" },
      pasar_al_dueno: { type: "boolean" },
      motivo: S,
      aviso_dueno: S,
    },
  };
}

export type BotReply = {
  reply: string;
  productos: string[];
  pedido: {
    cliente: string;
    codigo: string;
    producto: string;
    talle: string;
    cantidad: string;
    entrega: string;
    direccion: string;
    pago: string;
  };
  total: number;
  estado: string;
  mandar_link_pago: boolean;
  pasar_al_dueno: boolean;
  motivo: string;
  aviso_dueno: string;
};

export type InMsg = {
  role: "user" | "assistant";
  text: string;
  image?: string; // data URL (data:image/jpeg;base64,...), solo en mensajes del cliente
};

const IMAGE_RE = /^data:(image\/(?:jpeg|png|webp|gif));base64,/;

function toApi(msgs: InMsg[]): Anthropic.Beta.BetaMessageParam[] {
  return msgs.map((m) => {
    const match = m.role === "user" && m.image ? IMAGE_RE.exec(m.image) : null;
    if (m.image && match) {
      const mediaType = match[1] as
        "image/jpeg" | "image/png" | "image/webp" | "image/gif";
      return {
        role: "user",
        content: [
          {
            type: "image",
            source: {
              type: "base64",
              media_type: mediaType,
              data: m.image.slice(match[0].length),
            },
          },
          { type: "text", text: m.text || "(mandó esta foto)" },
        ],
      };
    }
    return { role: m.role, content: m.text };
  });
}

export class RefusalError extends Error {}

// Devuelve la respuesta del bot ya parseada. Los errores de la API se propagan
// (Anthropic.APIError y sus subclases) para que cada canal decida qué hacer.
export async function askBot(
  messages: InMsg[],
  channel: Channel,
  shop: { products: Product[]; settings: Settings },
): Promise<BotReply> {
  const response = await client.beta.messages.create({
    model: "claude-opus-5-5",
    max_tokens: 4000,
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    output_config: {
      effort: "low",
      format: { type: "json_schema", schema: schemaFor(shop.products) },
    },
    cache_control: { type: "ephemeral" },
    system: buildPrompt(channel, shop.products, shop.settings),
    messages: toApi(messages),
  });
  if (response.stop_reason === "refusal") throw new RefusalError();
  const text = response.content
    .flatMap((b) => (b.type === "text" ? [b.text] : []))
    .join("");
  return JSON.parse(text) as BotReply;
}
