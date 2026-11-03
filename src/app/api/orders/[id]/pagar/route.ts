// Arma un link de pago nuevo para un pedido pendiente y redirige a Mercado Pago.
// Lo usa el botón "Pagar con Mercado Pago" de la página de gracias (por si el cliente cerró la pestaña).
import { createPaymentLink, mpEnabled } from "@/lib/mercadopago";
import { getOrder } from "@/lib/orders";

export const runtime = "nodejs";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const id = Number((await params).id);
  const order = Number.isInteger(id) && id > 0 ? await getOrder(id) : null;
  const back = new URL(`/gracias?pedido=${id}`, process.env.PUBLIC_SITE_URL || req.url);
  if (!mpEnabled() || !order || order.payment !== "mercadopago" || order.status !== "PENDIENTE" || order.mpPaymentId) {
    return Response.redirect(back, 303);
  }
  try {
    return Response.redirect(await createPaymentLink(order), 303);
  } catch (error) {
    console.error("[mercadopago] no se pudo crear el link", error);
    back.searchParams.set("error", "mp");
    return Response.redirect(back, 303);
  }
}
