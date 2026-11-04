// Webhook del WhatsApp de la tienda. Sirve para los dos canales; la lógica del bot está en
// src/lib/whatsapp-bot.ts.
//
// API oficial de Meta (recomendada):
//   WHATSAPP_TOKEN, WHATSAPP_PHONE_NUMBER_ID  (ver src/lib/wa-cloud.ts)
//   WHATSAPP_APP_SECRET     "clave secreta de la app" en Meta, para validar la firma de cada aviso
//   WHATSAPP_VERIFY_TOKEN   texto al azar que se pega en Meta al configurar el webhook
//   URL del webhook en Meta: <PUBLIC_SITE_URL>/api/whatsapp
//   Con Kapso (proveedor con coexistencia): WHATSAPP_GRAPH_URL=https://api.kapso.ai/meta/whatsapp,
//   WHATSAPP_GRAPH_VERSION=v24.0, WHATSAPP_TOKEN=<API key de Kapso>, WHATSAPP_APP_SECRET=<secret_key
//   del webhook "meta" en Kapso>. Kapso no usa WHATSAPP_VERIFY_TOKEN.
//
// Evolution API:
//   WHATSAPP_WEBHOOK_TOKEN  Evolution llama a /api/whatsapp?token=<clave>
//   EVOLUTION_URL, EVOLUTION_API_KEY, EVOLUTION_INSTANCE  (ver src/lib/evolution.ts)
//
// Para los dos:
//   OWNER_WHATSAPP          número para los avisos (ej: 5493431234567). Opcional.
//   PUBLIC_SITE_URL         URL pública de la web, para mandar las fotos (ej: https://adan.com.ar)
import { parseCloudWebhook, validSignature, type CloudWebhook } from "@/lib/wa-cloud-webhook";
import { handleIncoming, handleMessage, type WaData } from "@/lib/whatsapp-bot";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const json = (body: unknown, status = 200) => Response.json(body, { status });

// Meta verifica la URL una vez, al configurar el webhook.
export function GET(req: Request) {
  const q = new URL(req.url).searchParams;
  const token = process.env.WHATSAPP_VERIFY_TOKEN;
  if (token && q.get("hub.mode") === "subscribe" && q.get("hub.verify_token") === token) {
    return new Response(q.get("hub.challenge") ?? "", { status: 200 });
  }
  return json({ error: "No autorizado" }, 403);
}

export async function POST(req: Request) {
  const raw = await req.text();
  let body: CloudWebhook & { event?: string; instance?: string; data?: WaData | WaData[] };
  try {
    body = JSON.parse(raw);
  } catch {
    return json({ error: "JSON inválido" }, 400);
  }

  if (body.object === "whatsapp_business_account") {
    const secret = process.env.WHATSAPP_APP_SECRET;
    if (!secret) return json({ error: "Webhook sin configurar" }, 503);
    const signature = req.headers.get("x-hub-signature-256") ?? req.headers.get("x-webhook-signature");
    if (!validSignature(raw, signature, secret)) return json({ error: "Firma inválida" }, 401);
    // Meta espera la respuesta enseguida: los mensajes se procesan después (el bot evita duplicados).
    for (const m of parseCloudWebhook(body)) {
      handleIncoming(m).catch((error) => console.error("[whatsapp] error procesando mensaje", error));
    }
    return json({ ok: true });
  }

  const secret = process.env.WHATSAPP_WEBHOOK_TOKEN;
  if (!secret) return json({ error: "Webhook sin configurar" }, 503);
  if (new URL(req.url).searchParams.get("token") !== secret) return json({ error: "No autorizado" }, 401);

  const event = (body.event || "").toLowerCase().replace(/_/g, ".");
  const instance = process.env.EVOLUTION_INSTANCE;
  if (event !== "messages.upsert" || (instance && body.instance && body.instance !== instance)) {
    return json({ ok: true, ignored: true });
  }

  const items = Array.isArray(body.data) ? body.data : body.data ? [body.data] : [];
  for (const d of items) {
    try {
      await handleMessage(d);
    } catch (error) {
      console.error("[whatsapp] error procesando mensaje", error);
    }
  }
  return json({ ok: true });
}
