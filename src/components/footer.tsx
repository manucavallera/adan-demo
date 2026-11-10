import Link from "next/link";
import { Truck, ArrowsClockwise, CreditCard, WhatsappLogo, InstagramLogo } from "@phosphor-icons/react/dist/ssr";
import { formatPrice, store, waLink, type Settings } from "@/lib/config";
import { shopCategories, type Product } from "@/lib/products";

export function Footer({ settings, products }: { settings: Settings; products: Product[] }) {
  const categories = shopCategories(products);
  const info = [
    {
      icon: Truck,
      title: "Envíos",
      text: settings.freeShippingFrom > 0 ? `A todo el país. Gratis desde ${formatPrice(settings.freeShippingFrom)}.` : "A todo el país.",
    },
    { icon: ArrowsClockwise, title: "Cambios", text: "Tenés 30 días para cambiar talle o prenda." },
    { icon: CreditCard, title: "Pagos", text: `${settings.installments ? `${settings.installments} con Mercado Pago` : "Mercado Pago"}. También transferencia o efectivo.` },
  ];

  return (
    <footer className="border-t border-line bg-surface">
      <div className="mx-auto max-w-7xl px-4 md:px-8">
        <dl className="grid gap-6 border-b border-line py-10 sm:grid-cols-3">
          {info.map(({ icon: Icon, title, text }) => (
            <div key={title} className="flex gap-4">
              <Icon size={26} className="shrink-0 text-accent" />
              <div>
                <dt className="font-semibold">{title}</dt>
                <dd className="mt-1 text-sm text-muted">{text}</dd>
              </div>
            </div>
          ))}
        </dl>

        <div className="flex flex-col gap-8 py-12 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="font-display text-6xl uppercase md:text-8xl">{store.name}</p>
            <p className="mt-2 text-muted">
              {store.tagline}.
              <br />
              {[settings.address, settings.city].filter(Boolean).join(", ")}.
            </p>
          </div>
          <div className="flex flex-col gap-6 sm:flex-row sm:gap-16">
            <ul className="text-sm">
              {categories.map((c) => (
                <li key={c.id}>
                  <Link href={`/?cat=${c.id}#ropa`} className="inline-flex min-h-11 items-center text-muted hover:text-ink">
                    {c.label}
                  </Link>
                </li>
              ))}
            </ul>
            <ul className="text-sm">
              <li>
                <a href={waLink(settings.whatsapp, `Hola ${store.name}!`)} target="_blank" rel="noopener noreferrer" className="flex min-h-11 items-center gap-2 text-muted hover:text-ink">
                  <WhatsappLogo size={18} /> WhatsApp
                </a>
              </li>
              <li>
                <a href={`https://instagram.com/${store.instagram}`} target="_blank" rel="noopener noreferrer" className="flex min-h-11 items-center gap-2 text-muted hover:text-ink">
                  <InstagramLogo size={18} /> Instagram
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="flex flex-col gap-4 border-t border-line py-6 text-sm md:flex-row md:items-center md:justify-between">
          <Link
            href="/arrepentimiento"
            className="inline-flex h-11 w-fit items-center border border-ink px-4 font-semibold"
          >
            Botón de arrepentimiento
          </Link>
          <ul className="flex flex-wrap gap-x-6 text-muted">
            <li><Link href="/terminos" className="inline-flex min-h-11 items-center hover:text-ink">Términos y condiciones</Link></li>
            <li><Link href="/privacidad" className="inline-flex min-h-11 items-center hover:text-ink">Privacidad</Link></li>
            <li>
              <a
                href="https://www.argentina.gob.ar/servicio/iniciar-un-reclamo-ante-defensa-del-consumidor"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex min-h-11 items-center hover:text-ink"
              >
                Defensa del consumidor
              </a>
            </li>
          </ul>
        </div>
        {(settings.legalName || settings.cuit) && (
          <p className="pb-6 text-xs text-muted">
            {[settings.legalName, settings.cuit && `CUIT ${settings.cuit}`].filter(Boolean).join(" · ")}
          </p>
        )}
      </div>
    </footer>
  );
}
