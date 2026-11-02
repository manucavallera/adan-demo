import Link from "next/link";
import { prisma } from "@/lib/db";
import { formatPrice } from "@/lib/config";
import { PageTitle } from "@/components/admin/ui";

export default async function AdminHome() {
  const now = new Date();
  const startOfDay = new Date(new Intl.DateTimeFormat("en-CA", { timeZone: "America/Argentina/Buenos_Aires" }).format(now) + "T00:00:00-03:00");
  const [pending, paid, today, paused, low, settings] = await Promise.all([
    prisma.order.count({ where: { status: "PENDIENTE" } }),
    prisma.order.count({ where: { status: "PAGADO" } }),
    prisma.order.aggregate({ where: { createdAt: { gte: startOfDay }, status: { not: "CANCELADO" } }, _count: true, _sum: { total: true } }),
    prisma.botChat.count({ where: { pausedUntil: { gt: now } } }),
    prisma.variant.findMany({ where: { stock: { lte: 1 }, product: { active: true } }, include: { product: { select: { name: true, id: true } } }, take: 12 }),
    prisma.settings.findUnique({ where: { id: 1 } }),
  ]);

  const cards = [
    { href: "/admin/pedidos", label: "Pendientes de pago", value: pending },
    { href: "/admin/pedidos", label: "Pagados para enviar", value: paid },
    { href: "/admin/pedidos?ver=todos", label: "Ventas de hoy", value: `${today._count} · ${formatPrice(today._sum.total ?? 0)}` },
    { href: "/admin/chats", label: "Chats que te pasó el bot", value: paused },
  ];

  return (
    <>
      <PageTitle title="Inicio" />
      {!settings?.whatsapp && (
        <p className="mb-6 border border-accent p-3 text-sm">
          Falta cargar el WhatsApp de la tienda. <Link href="/admin/ajustes" className="font-semibold underline">Ir a ajustes</Link>
        </p>
      )}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((c) => (
          <Link key={c.label} href={c.href} className="border border-line bg-surface p-5 hover:border-ink">
            <p className="text-sm text-muted">{c.label}</p>
            <p className="mt-2 text-3xl font-semibold tabular-nums">{c.value}</p>
          </Link>
        ))}
      </div>
      <section className="mt-10">
        <h2 className="mb-3 text-lg font-semibold">Para reponer</h2>
        {low.length ? (
          <ul className="divide-y divide-line border-y border-line text-sm">
            {low.map((v) => (
              <li key={v.id} className="flex justify-between py-2">
                <Link href={`/admin/productos/${v.product.id}`} className="hover:underline">
                  {v.product.name} · talle {v.size}
                </Link>
                <span className={v.stock === 0 ? "font-semibold text-accent" : "text-muted"}>{v.stock === 0 ? "Agotado" : "Queda 1"}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted">Todo con stock.</p>
        )}
      </section>
    </>
  );
}
