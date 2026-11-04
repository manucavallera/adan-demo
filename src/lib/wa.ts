// Envío de mensajes de WhatsApp. Elige el canal según las variables de entorno:
// - WHATSAPP_TOKEN + WHATSAPP_PHONE_NUMBER_ID: API oficial de Meta (src/lib/wa-cloud.ts).
// - EVOLUTION_URL: Evolution API (src/lib/evolution.ts).
import "server-only";
import * as cloud from "./wa-cloud";
import * as evo from "./evolution";

export type Provider = "cloud" | "evolution" | null;

export function provider(): Provider {
  if (cloud.cloudConfigured()) return "cloud";
  if (process.env.EVOLUTION_URL) return "evolution";
  return null;
}

// `to` es el número con código de país (ej: 5493431234567).
export async function sendText(to: string, text: string) {
  const p = provider();
  if (p === "cloud") return cloud.sendText(to, text);
  if (p === "evolution") return evo.sendText(to, text);
  throw new Error("WhatsApp sin configurar");
}

export async function sendImage(to: string, imageUrl: string, caption: string) {
  const p = provider();
  if (p === "cloud") return cloud.sendImage(to, imageUrl, caption);
  if (p === "evolution") return evo.sendImage(to, imageUrl, caption);
  throw new Error("WhatsApp sin configurar");
}

// Avisos al dueño (OWNER_WHATSAPP). Con la API oficial, un mensaje libre solo llega si el dueño
// le escribió a la tienda en las últimas 24 h; si no, se usa la plantilla WHATSAPP_OWNER_TEMPLATE
// (aprobada en Meta, con un parámetro {{1}} en el cuerpo). Nunca tira error: solo lo registra.
export async function notifyOwner(text: string) {
  const owner = process.env.OWNER_WHATSAPP?.replace(/\D/g, "");
  const p = provider();
  if (!owner || !p) return undefined;
  try {
    if (p === "evolution") return await evo.sendText(owner, text, 0);
    try {
      return await cloud.sendText(owner, text);
    } catch (error) {
      const template = process.env.WHATSAPP_OWNER_TEMPLATE;
      if (!(error instanceof cloud.CloudApiError) || error.code !== cloud.OUTSIDE_WINDOW || !template) throw error;
      return await cloud.sendTemplate(owner, template, process.env.WHATSAPP_OWNER_TEMPLATE_LANG || "es_AR", text);
    }
  } catch (error) {
    console.error("[whatsapp] no se pudo avisar al dueño", error);
    return undefined;
  }
}
