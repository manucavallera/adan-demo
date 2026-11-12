// Crea un pedido desde el checkout de la web.
import { createPaymentLink, mpEnabled } from "@/lib/mercadopago";
import { createOrder, OrderError, orderCode, type NewOrder } from "@/lib/orders";

export const runtime = "nodejs";

const json = (body: unknown, status = 200) => Response.json(body, { status });
const str = (v: unknown, max = 200) => (typeof v === "string" ? v.trim().slice(0, max) : "");

// Deja el número listo para wa.me: 54 9 + característica + número, sin el 0 ni el 15.
function normalizePhone(raw: string) {
  let d = raw.replace(/\D/g, "");
  if (d.startsWith("54")) d = d.slice(2);
  if (d.startsWith("9")) d = d.slice(1);
  if (d.startsWith("0")) d = d.slice(1);
  d = d.replace(/^(\d{2,4})15(\d{6,8})$/, "$1$2");
  return d.length === 10 ? `549${d}` : "";
}

export async function POST(req: Request) {
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return json({ error: "Datos inválidos" }, 400);
  }

  const delivery = body.delivery === "retiro" ? "retiro" : "envio";
  const payment = (["mercadopago", "transferencia", "efectivo"] as const).find((p) => p === body.payment);
  const phone = normalizePhone(str(body.phone, 30));
  const input: NewOrder = {
    name: str(body.name, 80),
    phone,
    delivery,
    address: str(body.address),
    city: str(body.city, 80),
    zip: str(body.zip, 8),
    payment: payment ?? "transferencia",
    items: Array.isArray(body.items)
      ? body.items.slice(0, 30).map((it: Record<string, unknown>) => ({
          id: str(it?.id, 40),
          color: str(it?.color, 40),
          size: str(it?.size, 20),
          qty: Math.floor(Number(it?.qty)),
        }))
      : [],
  };

  if (input.name.length < 3) return json({ error: "Falta tu nombre y apellido." }, 400);
  if (!phone) return json({ error: "Revisá tu número de WhatsApp (con característica, sin 0 ni 15)." }, 400);
  if (!payment || (payment === "efectivo" && delivery !== "retiro")) return json({ error: "Elegí una forma de pago válida." }, 400);
  if (delivery === "envio" && (!input.address || !input.city || !/^\d{4}$/.test(input.zip)))
    return json({ error: "Completá la dirección de envío." }, 400);
  if (input.items.length === 0 || input.items.some((it) => !it.id || !it.size || !(it.qty >= 1 && it.qty <= 20)))
    return json({ error: "El carrito está vacío o tiene datos inválidos." }, 400);

  try {
    const order = await createOrder(input);
    // Con Mercado Pago activo, el cliente va directo a pagar. Si MP falla, el pedido queda
    // guardado y la página de gracias muestra el botón para reintentar.
    let payUrl: string | undefined;
    if (order.payment === "mercadopago" && mpEnabled()) {
      payUrl = await createPaymentLink(order).catch((error) => {
        console.error("[mercadopago] no se pudo crear el link", error);
        return undefined;
      });
    }
    return json({ id: order.id, code: orderCode(order.id), total: order.total, payUrl });
  } catch (error) {
    if (error instanceof OrderError) return json({ error: error.message }, 409);
    console.error("[pedidos] error al crear", error);
    return json({ error: "No pudimos guardar el pedido. Probá de nuevo o escribinos por WhatsApp." }, 500);
  }
}
