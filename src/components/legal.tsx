// Piezas comunes de las páginas legales (términos, privacidad, arrepentimiento).
import type { Settings } from "@/lib/config";
import { store } from "@/lib/config";

export function LegalPage({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <main className="mx-auto max-w-3xl px-4 py-16 md:px-8 md:py-20">
      <h1 className="font-display text-5xl uppercase md:text-6xl">{title}</h1>
      <div className="mt-8 space-y-4 text-base leading-relaxed text-muted [&_h2]:mt-10 [&_h2]:text-lg [&_h2]:font-semibold [&_h2]:text-ink [&_strong]:text-ink">
        {children}
      </div>
    </main>
  );
}

// "ADAN, de Juan Pérez (CUIT 20-...)". Si el dueño todavía no cargó los datos, queda solo la marca.
export function sellerLine(s: Settings) {
  const who = [s.legalName, s.cuit && `CUIT ${s.cuit}`].filter(Boolean).join(", ");
  return who ? `${store.name} (${who})` : store.name;
}

export function contactLine(s: Settings) {
  return [s.whatsapp && `WhatsApp +${s.whatsapp}`, s.email, [s.address, s.city].filter(Boolean).join(", ")]
    .filter(Boolean)
    .join(" · ");
}
