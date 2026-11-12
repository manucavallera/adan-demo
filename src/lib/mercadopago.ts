// Mercado Pago Checkout Pro: crea el link de pago de un pedido y confirma los pagos que avisa MP.
// Si MP_ACCESS_TOKEN está vacío, la tienda sigue como antes (el dueño manda el link por WhatsApp).
import "server-only";
import crypto from "node:crypto";
import { store } from "./config";
import { itemLabel } from "./orders";

const API = "https://api.mercadopago.com";

export const mpEnabled = () => Boolean(process.env.MP_ACCESS_TOKEN);

function siteUrl() {
  return (process.env.PUBLIC_SITE_URL || "").replace(/\/$/, "");
}

async function mp<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${process.env.MP_ACCESS_TOKEN}`,
      "Content-Type": "application/json",
      ...init?.headers,
    },
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`Mercado Pago ${res.status}: ${(await res.text()).slice(0, 300)}`);
  return res.json() as Promise<T>;
}

type OrderForPayment = {
  id: number;
  name: string;
  phone: string;
  shipping: number;
  items: { productId: string; name: string; color: string; size: string; qty: number; price: number }[];
};

// Devuelve la URL de Mercado Pago a la que mandar al cliente.
export async function createPaymentLink(order: OrderForPayment) {
  const base = siteUrl();
  const back = `${base}/gracias?pedido=${order.id}`;
  const pref = await mp<{ init_point: string }>("/checkout/preferences", {
    method: "POST",
    headers: { "X-Idempotency-Key": crypto.randomUUID() },
    body: JSON.stringify({
      items: order.items.map((it) => ({
        id: it.productId,
        title: `${it.name} (${itemLabel(it)})`,
        quantity: it.qty,
        unit_price: it.price,
        currency_id: "ARS",
      })),
      shipments: order.shipping > 0 ? { cost: order.shipping, mode: "not_specified" } : undefined,
      payer: { name: order.name },
      external_reference: String(order.id),
      statement_descriptor: store.name,
      back_urls: { success: back, pending: back, failure: back },
      auto_return: "approved",
      notification_url: `${base}/api/mercadopago`,
      // El link vence a las 48 h para no cobrar un pedido viejo con el stock ya liberado.
      expires: true,
      expiration_date_to: new Date(Date.now() + 48 * 3600 * 1000).toISOString(),
    }),
  });
  return pref.init_point;
}

export type MpPayment = {
  id: number;
  status: string; // approved, pending, in_process, rejected, cancelled, refunded...
  external_reference: string | null;
  transaction_amount: number;
  currency_id: string;
};

// Siempre se consulta el pago a MP: nunca se confía en lo que trae el aviso.
export function getPayment(id: string) {
  return mp<MpPayment>(`/v1/payments/${encodeURIComponent(id)}`);
}

// Verifica la firma x-signature del aviso. Si no hay MP_WEBHOOK_SECRET, no se exige
// (igual es seguro porque el pago se consulta a MP con el token).
export function validSignature(req: Request, dataId: string) {
  const secret = process.env.MP_WEBHOOK_SECRET;
  if (!secret) return true;
  const header = req.headers.get("x-signature") || "";
  const requestId = req.headers.get("x-request-id") || "";
  const parts = Object.fromEntries(header.split(",").map((p) => p.trim().split("=", 2) as [string, string]));
  if (!parts.ts || !parts.v1) return false;
  const manifest = `id:${dataId.toLowerCase()};request-id:${requestId};ts:${parts.ts};`;
  const expected = crypto.createHmac("sha256", secret).update(manifest).digest("hex");
  const a = Buffer.from(expected);
  const b = Buffer.from(parts.v1);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}
