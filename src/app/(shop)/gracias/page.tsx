import Link from "next/link";
import { CheckCircle, WhatsappLogo } from "@phosphor-icons/react/dist/ssr";
import { formatPrice, store, waLink } from "@/lib/config";
import { getShop } from "@/lib/shop";
import { getOrder, orderCode } from "@/lib/orders";

export const dynamic = "force-dynamic";

export default async function ThanksPage({ searchParams }: { searchParams: Promise<{ pedido?: string }> }) {
  const { pedido } = await searchParams;
  const id = Number(pedido);
  const order = Number.isInteger(id) && id > 0 ? await getOrder(id) : null;
  const { settings } = await getShop();

  const code = order ? orderCode(order.id) : "";
  const firstName = order?.name.split(" ")[0];
  const transfer = [
    settings.transferAlias && `Alias: ${settings.transferAlias}`,
    settings.transferCbu && `CBU/CVU: ${settings.transferCbu}`,
    settings.transferHolder && `Titular: ${settings.transferHolder}`,
  ].filter(Boolean) as string[];

  return (
    <main className="mx-auto flex min-h-[70dvh] max-w-3xl flex-col justify-center px-4 py-20 md:px-8">
      <CheckCircle size={56} weight="fill" className="text-accent" />
      <h1 className="mt-6 font-display text-5xl uppercase md:text-7xl">
        {firstName ? `Gracias, ${firstName}` : "Gracias por tu compra"}
      </h1>

      {order ? (
        <div className="mt-4 max-w-[52ch] space-y-4 text-lg text-muted">
          <p>
            Recibimos tu pedido <strong className="text-ink">{code}</strong> por{" "}
            <strong className="text-ink">{formatPrice(order.total)}</strong>. Ya te reservamos las prendas.
          </p>
          {order.payment === "transferencia" && (
            <div className="border border-line bg-surface p-5 text-base text-ink">
              <p className="font-semibold">Datos para transferir {formatPrice(order.total)}</p>
              {transfer.length ? (
                <ul className="mt-2 space-y-1">
                  {transfer.map((t) => (
                    <li key={t}>{t}</li>
                  ))}
                </ul>
              ) : (
                <p className="mt-2 text-muted">Te los mandamos por WhatsApp.</p>
              )}
              <p className="mt-3 text-sm text-muted">Mandanos el comprobante por WhatsApp con el número de pedido.</p>
            </div>
          )}
          {order.payment === "mercadopago" && <p>En un ratito te mandamos por WhatsApp el link de pago de Mercado Pago.</p>}
          {order.payment === "efectivo" && <p>Pagás en efectivo cuando retirás en el local. Te avisamos por WhatsApp cuando esté listo.</p>}
        </div>
      ) : (
        <p className="mt-4 max-w-[48ch] text-lg text-muted">Recibimos tu pedido. Te escribimos por WhatsApp para coordinar.</p>
      )}

      <div className="mt-10 flex flex-wrap gap-3">
        <Link href="/" className="flex h-13 items-center bg-accent px-7 font-semibold text-on-accent">
          Seguir mirando
        </Link>
        <a
          href={waLink(settings.whatsapp, `Hola ${store.name}! Te escribo por mi pedido ${code}.`)}
          target="_blank"
          rel="noopener noreferrer"
          className="flex h-13 items-center gap-2 border border-ink px-7 font-semibold"
        >
          <WhatsappLogo size={20} weight="fill" /> {order?.payment === "transferencia" ? "Mandar comprobante" : "Escribinos"}
        </a>
      </div>
    </main>
  );
}
