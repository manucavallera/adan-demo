import Link from "next/link";
import { prisma } from "@/lib/db";
import { formatPrice } from "@/lib/config";
import { ArrowRight, ChatsCircle, CurrencyDollar, Hourglass, Package, Warning, WarningCircle } from "@phosphor-icons/react/dist/ssr";
import { Notice, PageTitle } from "@/components/admin/ui";

// Cada tarjeta tiene un color según lo que pide: ámbar = esperar o cobrar, verde = mandar, rojo = atender ya.
const TONE = {
  warn: "border-warn bg-warn-soft text-warn",
  ok: "border-ok bg-ok-soft text-ok",
  danger: "border-danger bg-danger-soft text-danger",
  brand: "border-accent bg-surface text-accent",
} as const;

export default async function AdminHome() {
  const now = new Date();
  const startOfDay = new Date(new Intl.DateTimeFormat("en-CA", { timeZone: "America/Argentina/Buenos_Aires" }).format(now) + "T00:00:00-03:00");
  const [pending, paid, today, paused, low, settings, withdrawals] = await Promise.all([
    prisma.order.count({ where: { status: "PENDIENTE" } }),
    prisma.order.count({ where: { status: "PAGADO" } }),
    prisma.order.aggregate({ where: { createdAt: { gte: startOfDay }, status: { not: "CANCELADO" } }, _count: true, _sum: { total: true } }),
    prisma.botChat.count({ where: { pausedUntil: { gt: now } } }),
    prisma.variant.findMany({ where: { stock: { lte: 1 }, product: { active: true } }, include: { product: { select: { name: true, id: true } } }, take: 12 }),
    prisma.settings.findUnique({ where: { id: 1 } }),
    prisma.withdrawal.count({ where: { handled: false } }),
  ]);

  const cards = [
    { href: "/admin/pedidos", label: "Pendientes de pago", hint: "Esperando que paguen", value: pending, tone: "warn", icon: Hourglass, on: pending > 0 },
    { href: "/admin/pedidos", label: "Pagados para enviar", hint: "Prepará y mandá", value: paid, tone: "ok", icon: Package, on: paid > 0 },
    { href: "/admin/chats", label: "Chats que te pasó el bot", hint: "Respondé a mano", value: paused, tone: "danger", icon: ChatsCircle, on: paused > 0 },
    { href: "/admin/pedidos?ver=todos", label: "Ventas de hoy", hint: formatPrice(today._sum.total ?? 0), value: today._count, tone: "brand", icon: CurrencyDollar, on: true },
  ] as const;

  return (
    <>
      <PageTitle title="Inicio" />
      <div className="mb-6 space-y-2 empty:hidden">
        {withdrawals > 0 && (
          <Notice tone="danger" icon={<WarningCircle size={20} weight="fill" />}>
            {withdrawals === 1 ? "Hay 1 arrepentimiento" : `Hay ${withdrawals} arrepentimientos`} para atender.{" "}
            <Link href="/admin/pedidos" className="font-semibold underline">Ver en pedidos</Link>
          </Notice>
        )}
        {!settings?.whatsapp && (
          <Notice tone="warn" icon={<Warning size={20} weight="fill" />}>
            Falta cargar el WhatsApp de la tienda. <Link href="/admin/ajustes" className="font-semibold underline">Ir a ajustes</Link>
          </Notice>
        )}
      </div>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {cards.map((c) => {
          const I = c.icon;
          return (
            <Link
              key={c.label}
              href={c.href}
              className={`group flex flex-col border-l-4 p-4 transition-colors sm:p-5 ${c.on ? TONE[c.tone] : "border-line bg-surface text-muted"}`}
            >
              <div className="flex items-center justify-between">
                <I size={22} weight={c.on ? "fill" : "regular"} aria-hidden />
                <ArrowRight size={16} aria-hidden className="opacity-0 transition-opacity group-hover:opacity-100" />
              </div>
              <p className={`mt-3 text-4xl font-semibold tabular-nums ${c.on ? "" : "text-muted"}`}>{c.value}</p>
              <p className="mt-1 text-sm font-semibold text-ink">{c.label}</p>
              <p className="text-xs text-muted">{c.on ? c.hint : "Nada por ahora"}</p>
            </Link>
          );
        })}
      </div>
      <section className="mt-10">
        <h2 className="mb-3 text-lg font-semibold">Para reponer</h2>
        {low.length ? (
          <ul className="divide-y divide-line border-y border-line text-sm">
            {low.map((v) => (
              <li key={v.id} className="flex items-center justify-between gap-3 py-2.5">
                <Link href={`/admin/productos/${v.product.id}`} className="min-w-0 truncate hover:underline">
                  {v.product.name} · {v.color && `${v.color} · `}talle {v.size}
                </Link>
                <span className={`shrink-0 px-2 py-0.5 text-xs font-semibold ${v.stock === 0 ? "bg-danger-soft text-danger" : "bg-warn-soft text-warn"}`}>
                  {v.stock === 0 ? "Agotado" : "Queda 1"}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-ok">Todo con stock.</p>
        )}
      </section>
    </>
  );
}
