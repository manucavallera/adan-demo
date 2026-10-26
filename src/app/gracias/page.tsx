import Link from "next/link";
import { CheckCircle, WhatsappLogo } from "@phosphor-icons/react/dist/ssr";
import { store, waLink } from "@/lib/config";

export default async function ThanksPage({
  searchParams,
}: {
  searchParams: Promise<{ pedido?: string; nombre?: string }>;
}) {
  const { pedido = "CU-0000", nombre } = await searchParams;

  return (
    <main className="mx-auto flex min-h-[70dvh] max-w-3xl flex-col justify-center px-4 py-20 md:px-8">
      <CheckCircle size={56} weight="fill" className="text-accent" />
      <h1 className="mt-6 font-display text-5xl uppercase md:text-7xl">
        {nombre ? `Gracias, ${nombre}` : "Gracias por tu compra"}
      </h1>
      <p className="mt-4 max-w-[48ch] text-lg text-muted">
        Recibimos tu pago. Tu pedido es el <strong className="text-ink">{pedido}</strong> y te vamos a
        avisar por WhatsApp cuando salga.
      </p>
      <div className="mt-10 flex flex-wrap gap-3">
        <Link href="/" className="flex h-13 items-center bg-accent px-7 font-semibold text-on-accent">
          Seguir mirando
        </Link>
        <a
          href={waLink(`Hola ${store.name}! Quiero consultar por mi pedido ${pedido}.`)}
          target="_blank"
          rel="noopener noreferrer"
          className="flex h-13 items-center gap-2 border border-ink px-7 font-semibold"
        >
          <WhatsappLogo size={20} weight="fill" /> Consultar mi pedido
        </a>
      </div>
    </main>
  );
}
