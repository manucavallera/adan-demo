// Aviso de Mercado Pago (notification_url de cada link de pago).
// Llega con ?type=payment&data.id=123 (webhook) o ?topic=payment&id=123 (IPN viejo).
import { getPayment, mpEnabled, validSignature } from "@/lib/mercadopago";
import { confirmMpPayment } from "@/lib/orders";

export const runtime = "nodejs";

export async function POST(req: Request) {
  if (!mpEnabled()) return new Response("off", { status: 200 });
  const url = new URL(req.url);
  const body = (await req.json().catch(() => ({}))) as { type?: string; topic?: string; data?: { id?: string | number } };

  const type = body.type || url.searchParams.get("type") || url.searchParams.get("topic");
  const id = String(body.data?.id ?? url.searchParams.get("data.id") ?? url.searchParams.get("id") ?? "");
  // Otros avisos (merchant_order, etc.) no hacen falta: se responde 200 para que MP no reintente.
  if (type !== "payment" || !/^\d+$/.test(id)) return new Response("ok");
  if (!validSignature(req, id)) return new Response("firma inválida", { status: 401 });

  try {
    const payment = await getPayment(id);
    const orderId = Number(payment.external_reference);
    if (payment.status === "approved" && payment.currency_id === "ARS" && Number.isInteger(orderId) && orderId > 0) {
      await confirmMpPayment(orderId, String(payment.id), payment.transaction_amount);
    }
    return new Response("ok");
  } catch (error) {
    console.error("[mercadopago] error con el aviso", id, error);
    // 500 hace que MP vuelva a intentar más tarde.
    return new Response("error", { status: 500 });
  }
}
