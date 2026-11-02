import Link from "next/link";
import type { OrderStatus } from "@prisma/client";
import { prisma } from "@/lib/db";
import { formatPrice } from "@/lib/config";
import { orderCode, PAYMENT_LABEL } from "@/lib/orders";
import { PageTitle, STATUS_LABEL, StatusBadge, dateAR } from "@/components/admin/ui";

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

  return (
    <>
      <PageTitle title="Pedidos" />
      <div className="no-scrollbar mb-5 flex gap-2 overflow-x-auto">
        {FILTERS.map((f) => (
          <Link
            key={f.id}
            href={`/admin/pedidos?ver=${f.id}`}
            className={`flex h-10 shrink-0 items-center border px-4 text-sm ${f.id === filter.id ? "border-ink bg-ink text-canvas" : "border-line"}`}
          >
            {f.label}
          </Link>
        ))}
      </div>
      <ul className="divide-y divide-line border-y border-line">
        {orders.map((o) => (
          <li key={o.id}>
            <Link href={`/admin/pedidos/${o.id}`} className="flex flex-col gap-1 py-4 hover:bg-surface sm:flex-row sm:items-center sm:gap-4">
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
