import Link from "next/link";
import type { OrderStatus } from "@prisma/client";
import { prisma } from "@/lib/db";
import { formatPrice, waLink } from "@/lib/config";
import { orderCode, PAYMENT_LABEL, withdrawalCode } from "@/lib/orders";
import { markWithdrawalHandled } from "./actions";
import { PageTitle, STATUS_BAR, STATUS_LABEL, StatusBadge, dateAR } from "@/components/admin/ui";

const FILTERS: { id: string; label: string; where: OrderStatus[] | null }[] = [
  { id: "abiertos", label: "Para atender", where: ["PENDIENTE", "PAGADO"] },
  { id: "enviados", label: "Enviados", where: ["ENVIADO"] },
  { id: "cerrados", label: "Entregados", where: ["ENTREGADO"] },
  { id: "cancelados", label: "Cancelados", where: ["CANCELADO"] },
  { id: "todos", label: "Todos", where: null },
];

export default async function OrdersPage({ searchParams }: { searchParams: Promise<{ ver?: string }> }) {
  const { ver = "abiertos" } = await searchParams;
  const filter = FILTERS.find((f) => f.id === ver) ?? FILTERS[0];
  const orders = await prisma.order.findMany({
    where: filter.where ? { status: { in: filter.where } } : {},
    include: { items: true },
    orderBy: { createdAt: "desc" },
    take: 100,
  });
  const withdrawals = await prisma.withdrawal.findMany({ where: { handled: false }, orderBy: { createdAt: "asc" } });

  return (
    <>
      <PageTitle title="Pedidos" />
      {withdrawals.length > 0 && (
        <section className="mb-8 border-l-4 border-danger bg-danger-soft p-5">
          <h2 className="font-semibold text-danger">Arrepentimientos para atender ({withdrawals.length})</h2>
          <p className="mt-1 text-sm text-muted">
            El cliente tiene derecho a devolver la compra sin costo. Escribile, coordiná la devolución y reintegrale el total.
          </p>
          <ul className="mt-4 divide-y divide-danger/20">
            {withdrawals.map((w) => (
              <li key={w.id} className="flex flex-col gap-3 py-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <p className="font-medium">
                    {withdrawalCode(w.id)} · {w.name} <span className="text-muted">+{w.phone}</span>
                  </p>
                  <p className="text-sm text-muted">
                    {[w.orderCode && `Pedido ${w.orderCode}`, w.reason, w.email, dateAR(w.createdAt)].filter(Boolean).join(" · ")}
                  </p>
                </div>
                <div className="flex shrink-0 gap-2">
                  <a
                    href={waLink(w.phone, `Hola ${w.name.split(" ")[0]}! Recibimos tu pedido de arrepentimiento ${withdrawalCode(w.id)}. Te escribo para coordinar la devolución.`)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex h-10 items-center bg-[#25d366] px-3 text-sm font-semibold text-[#0b1f12]"
                  >
                    WhatsApp
                  </a>
                  <form action={markWithdrawalHandled.bind(null, w.id)}>
                    <button type="submit" className="h-10 cursor-pointer border border-ink/30 bg-surface px-3 text-sm hover:border-ink">
                      Ya lo atendí
                    </button>
                  </form>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}
      <div className="no-scrollbar mb-5 flex gap-2 overflow-x-auto">
        {FILTERS.map((f) => (
          <Link
            key={f.id}
            href={`/admin/pedidos?ver=${f.id}`}
            className={`flex h-10 shrink-0 items-center border px-4 text-sm ${f.id === filter.id ? "border-accent bg-accent text-on-accent" : "border-line hover:border-ink"}`}
          >
            {f.label}
          </Link>
        ))}
      </div>
      <ul className="space-y-2">
        {orders.map((o) => (
          <li key={o.id}>
            <Link href={`/admin/pedidos/${o.id}`} className={`flex flex-col gap-1 border-l-4 bg-surface px-4 py-3 hover:bg-line/40 sm:flex-row sm:items-center sm:gap-4 ${STATUS_BAR[o.status] ?? "border-l-line"}`}>
              <div className="flex items-center gap-3 sm:w-64">
                <strong className="tabular-nums">{orderCode(o.id)}</strong>
                <StatusBadge status={o.status} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{o.name}</p>
                <p className="truncate text-sm text-muted">
                  {o.items.map((it) => `${it.qty}× ${it.name} ${it.size}`).join(", ")}
                </p>
              </div>
              <div className="text-sm sm:text-right">
                <p className="font-semibold tabular-nums">{formatPrice(o.total)}</p>
                <p className="text-muted">
                  {PAYMENT_LABEL[o.payment]} · {o.delivery === "envio" ? "Envío" : "Retiro"} · {dateAR(o.createdAt)}
                </p>
              </div>
            </Link>
          </li>
        ))}
      </ul>
      {orders.length === 0 && <p className="py-10 text-center text-muted">No hay pedidos {filter.id === "todos" ? "todavía" : `en "${filter.label}"`}.</p>}
      <p className="mt-4 text-xs text-muted">Estados: {Object.values(STATUS_LABEL).join(" → ")}.</p>
    </>
  );
}
