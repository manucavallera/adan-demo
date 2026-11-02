// Webhook de Evolution API para el WhatsApp de la tienda. La lógica del bot está en
// src/lib/whatsapp-bot.ts.
//
// Variables de entorno:
//   WHATSAPP_WEBHOOK_TOKEN  clave secreta; Evolution llama a /api/whatsapp?token=<clave>
//   EVOLUTION_URL, EVOLUTION_API_KEY, EVOLUTION_INSTANCE  (ver src/lib/evolution.ts)
//   OWNER_WHATSAPP          número del dueño para los avisos (ej: 5493431234567). Opcional.
//   PUBLIC_SITE_URL         URL pública de la web, para mandar las fotos (ej: https://adan.com.ar)
import { handleMessage, type WaData } from "@/lib/whatsapp-bot";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const secret = process.env.WHATSAPP_WEBHOOK_TOKEN;
  if (!secret) return Response.json({ error: "Webhook sin configurar" }, { status: 503 });
  if (new URL(req.url).searchParams.get("token") !== secret) return Response.json({ error: "No autorizado" }, { status: 401 });

  let body: { event?: string; instance?: string; data?: WaData | WaData[] };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "JSON inválido" }, { status: 400 });
  }

  const event = (body.event || "").toLowerCase().replace(/_/g, ".");
  const instance = process.env.EVOLUTION_INSTANCE;
  if (event !== "messages.upsert" || (instance && body.instance && body.instance !== instance)) {
    return Response.json({ ok: true, ignored: true });
  }

  const items = Array.isArray(body.data) ? body.data : body.data ? [body.data] : [];
  for (const d of items) {
    try {
      await handleMessage(d);
    } catch (error) {
      console.error("[whatsapp] error procesando mensaje", error);
    }
  }
  return Response.json({ ok: true });
}
