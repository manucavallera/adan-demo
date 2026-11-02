import Link from "next/link";
import { notFound } from "next/navigation";
import { formatPrice, store, waLink } from "@/lib/config";
import { getOrder, orderCode, PAYMENT_LABEL } from "@/lib/orders";
import { StatusBadge, dateAR } from "@/components/admin/ui";
import { OrderControls } from "@/components/admin/order-controls";

export default async function OrderPage({ params }: { params: Promise<{ id: string }> }) {
  const id = Number((await params).id);
  const order = Number.isInteger(id) ? await getOrder(id) : null;
  if (!order) notFound();
  const code = orderCode(order.id);

  return (
    <>
      <Link href="/admin/pedidos" className="mb-4 inline-flex h-10 items-center text-sm text-muted hover:text-ink">
        ← Volver a pedidos
      </Link>
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <h1 className="font-display text-4xl uppercase">Pedido {code}</h1>
        <StatusBadge status={order.status} />
      </div>

      <div className="grid gap-8 lg:grid-cols-2">
        <section className="space-y-6">
          <div className="border border-line bg-surface p-5">
            <h2 className="mb-3 font-semibold">Cliente</h2>
            <p>{order.name}</p>
            <p className="text-muted">+{order.phone}</p>
            <a
              href={waLink(order.phone, `Hola ${order.name.split(" ")[0]}! Te escribo de ${store.name} por tu pedido ${code}.`)}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3 inline-flex h-11 items-center bg-[#25d366] px-4 text-sm font-semibold text-[#0b1f12]"
            >
              Escribirle por WhatsApp
            </a>
          </div>
          <div className="border border-line bg-surface p-5">
            <h2 className="mb-3 font-semibold">Entrega y pago</h2>
            <p>{order.delivery === "envio" ? `Envío a ${order.address}, ${order.city} (CP ${order.zip})` : "Retira en el local"}</p>
            <p className="text-muted">Pago: {PAYMENT_LABEL[order.payment] ?? order.payment}</p>
            <p className="text-muted">Hecho el {dateAR(order.createdAt)}</p>
          </div>
        </section>

        <section className="space-y-6">
          <div className="border border-line bg-surface p-5">
            <h2 className="mb-3 font-semibold">Prendas</h2>
            <ul className="space-y-2">
              {order.items.map((it) => (
                <li key={it.id} className="flex justify-between gap-3">
                  <span>
                    {it.qty} × {it.name} <span className="text-muted">talle {it.size} · {it.productId}</span>
                  </span>
                  <span className="tabular-nums">{formatPrice(it.price * it.qty)}</span>
                </li>
              ))}
            </ul>
            <dl className="mt-4 space-y-1 border-t border-line pt-3 text-sm">
              <div className="flex justify-between"><dt className="text-muted">Subtotal</dt><dd className="tabular-nums">{formatPrice(order.subtotal)}</dd></div>
              {order.discount > 0 && (
                <div className="flex justify-between"><dt className="text-muted">Descuento</dt><dd className="tabular-nums">−{formatPrice(order.discount)}</dd></div>
              )}
              <div className="flex justify-between"><dt className="text-muted">Envío</dt><dd className="tabular-nums">{order.shipping ? formatPrice(order.shipping) : "Gratis"}</dd></div>
              <div className="flex justify-between pt-1 text-base font-semibold"><dt>Total</dt><dd className="tabular-nums">{formatPrice(order.total)}</dd></div>
            </dl>
          </div>
          <OrderControls id={order.id} status={order.status} notes={order.notes} />
        </section>
      </div>
    </>
  );
}
