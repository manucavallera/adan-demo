import Image from "next/image";
import Link from "next/link";
import { Suspense } from "react";
import {
  ArrowRight,
  WhatsappLogo,
  InstagramLogo,
} from "@phosphor-icons/react/dist/ssr";
import { categories } from "@/lib/products";
import { store } from "@/lib/config";
import { WaLink } from "@/components/wa-link";
import { Catalog } from "@/components/catalog";
import { Reveal } from "@/components/reveal";
import { HeroMotion } from "@/components/hero-motion";
import {
  HeroTitle,
  HeroImage,
  Marquee,
  Parallax,
} from "@/components/motion-bits";

export default function Home() {
  const [featured, ...rest] = categories;

  return (
    <main>
      {/* Hero */}
      <section className="mx-auto grid max-w-7xl gap-8 px-4 pt-8 pb-16 md:grid-cols-12 md:items-center md:px-8 md:pt-12 md:pb-24">
        <HeroMotion className="md:col-span-7">
          <HeroTitle
            text="Ropa de hombre, formal y urbana"
            className="font-display text-[clamp(2.75rem,13vw,3rem)] leading-[1] uppercase sm:text-6xl md:text-6xl lg:text-7xl xl:text-8xl"
          />
          <p className="mt-6 max-w-[42ch] text-lg leading-relaxed text-muted">
            {store.installments} y envíos a todo el país. Comprá acá o
            escribinos por WhatsApp.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link
              href="#ropa"
              className="flex h-13 items-center justify-center gap-2 bg-accent px-7 font-semibold text-on-accent transition-transform hover:-translate-y-0.5 active:scale-[0.98]"
            >
              Ver la ropa
              <ArrowRight size={18} weight="bold" />
            </Link>
            <WaLink
              message={`Hola ${store.name}! Quiero hacer una consulta.`}
              className="flex h-13 items-center justify-center gap-2 border border-ink px-7 font-semibold transition-transform hover:-translate-y-0.5 active:scale-[0.98]"
            >
              <WhatsappLogo size={20} weight="fill" />
              Escribinos
            </WaLink>
          </div>
        </HeroMotion>

        <div className="md:col-span-5 md:col-start-8">
          <HeroImage
            src="/img/adan/outfit-urbano.jpg"
            alt="Outfit urbano: remera oversize verde, bermuda de jean gris, medias y bóxer"
          />
        </div>
      </section>

      <Marquee
        items={[
          store.installments,
          "Envíos a todo el país",
          `${store.address}, Viale`,
          "Formal y urbano",
        ]}
      />

      {/* Categorías */}
      <section className="mx-auto max-w-7xl px-4 py-20 md:px-8">
        <Reveal>
          <h2 className="font-display text-4xl uppercase md:text-5xl">
            Elegí por categoría
          </h2>
        </Reveal>
        <div className="mt-8 grid grid-cols-2 gap-3 md:grid-cols-4 md:grid-rows-2 md:gap-4">
          <CategoryTile
            cat={featured}
            className="col-span-2 aspect-[4/3] md:row-span-2 md:aspect-auto"
            big
          />
          {rest.map((c, i) => (
            <CategoryTile
              key={c.id}
              cat={c}
              delay={0.08 * (i + 1)}
              className="aspect-square md:aspect-auto md:h-64"
            />
          ))}
        </div>
      </section>

      {/* Catálogo */}
      <section
        id="ropa"
        className="scroll-mt-28 border-t border-line bg-surface"
      >
        <div className="mx-auto max-w-7xl px-4 py-16 md:px-8 md:py-24">
          <h2 className="mb-8 font-display text-4xl uppercase md:text-5xl">
            Toda la ropa
          </h2>
          <Suspense fallback={<CatalogSkeleton />}>
            <Catalog />
          </Suspense>
        </div>
      </section>

      {/* Cómo comprar */}
      <section className="mx-auto max-w-7xl px-4 py-20 md:px-8 md:py-28">
        <Reveal>
          <h2 className="max-w-[16ch] font-display text-4xl uppercase md:text-6xl">
            Comprá como te quede más cómodo
          </h2>
        </Reveal>
        <div className="mt-12 grid gap-12 md:grid-cols-2 md:gap-0 md:divide-x md:divide-line">
          <Reveal className="md:pr-12">
            <h3 className="text-2xl font-semibold">En la web</h3>
            <ol className="mt-5 space-y-3 text-muted">
              <li>Elegís la prenda y tu talle.</li>
              <li>
                Pagás con Mercado Pago: tarjeta, débito o dinero en cuenta.
              </li>
              <li>Te llega por correo o la retirás en el local.</li>
            </ol>
          </Reveal>
          <Reveal delay={0.1} className="md:pl-12">
            <h3 className="text-2xl font-semibold">Por WhatsApp</h3>
            <ol className="mt-5 space-y-3 text-muted">
              <li>Tocás “Consultar por WhatsApp” en la prenda.</li>
              <li>Te respondemos al toque con stock, medidas y fotos.</li>
              <li>Te mandamos el link de pago y listo.</li>
            </ol>
          </Reveal>
        </div>
      </section>

      {/* Instagram */}
      <section className="border-t border-line">
        <div className="mx-auto grid max-w-7xl gap-6 px-4 py-20 md:grid-cols-12 md:items-end md:px-8 md:py-28">
          <Parallax speed={40} className="md:col-span-4">
            <Reveal className="relative aspect-[3/4] overflow-hidden bg-line">
              <Image
                src="/img/adan/gorras.jpg"
                alt="Gorras de visera curva en varios colores"
                fill
                sizes="(min-width: 768px) 33vw, 100vw"
                className="object-cover"
              />
            </Reveal>
          </Parallax>
          <Parallax speed={-50} className="hidden md:col-span-3 md:block">
            <Reveal
              delay={0.08}
              className="relative aspect-[3/4] overflow-hidden bg-line"
            >
              <Image
                src="/img/adan/pantalon-lino.jpg"
                alt="Pantalón de lino beige con cintura elastizada"
                fill
                sizes="25vw"
                className="object-cover"
              />
            </Reveal>
          </Parallax>
          <Reveal delay={0.16} className="md:col-span-4 md:col-start-9">
            <h2 className="font-display text-4xl uppercase md:text-5xl">
              Lo nuevo sale primero en Instagram
            </h2>
            <p className="mt-4 text-muted">
              Ingresos, combinaciones y ofertas. Y si pasás por Viale, te
              esperamos en {store.address}.
            </p>
            <a
              href={`https://instagram.com/${store.instagram}`}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-6 inline-flex h-13 max-w-full items-center gap-2 border border-ink px-6 font-semibold transition-transform hover:-translate-y-0.5 active:scale-[0.98]"
            >
              <InstagramLogo size={20} className="shrink-0" />
              <span className="truncate">@{store.instagram}</span>
            </a>
          </Reveal>
        </div>
      </section>
    </main>
  );
}

function CategoryTile({
  cat,
  className,
  big,
  delay = 0,
}: {
  cat: (typeof categories)[number];
  className?: string;
  big?: boolean;
  delay?: number;
}) {
  return (
    <Reveal delay={delay} className={`relative ${className ?? ""}`}>
      <Link
        href={`/?cat=${cat.id}#ropa`}
        className="group absolute inset-0 block overflow-hidden bg-line"
      >
        <Image
          src={cat.image}
          alt=""
          fill
          sizes={
            big
              ? "(min-width: 768px) 50vw, 100vw"
              : "(min-width: 768px) 25vw, 50vw"
          }
          className="object-cover transition-transform duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-105"
        />
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-4 pt-16 md:p-6">
          <span
            className={`inline-block font-display uppercase text-white transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:translate-x-2 ${big ? "text-4xl md:text-6xl" : "text-2xl md:text-3xl"}`}
          >
            {cat.label}
          </span>
        </div>
      </Link>
    </Reveal>
  );
}

function CatalogSkeleton() {
  return (
    <div className="mt-8 grid grid-cols-2 gap-x-4 gap-y-10 sm:grid-cols-3 lg:grid-cols-4">
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i}>
          <div className="aspect-[4/5] animate-pulse bg-line" />
          <div className="mt-3 h-4 w-3/4 animate-pulse bg-line" />
          <div className="mt-2 h-4 w-1/3 animate-pulse bg-line" />
        </div>
      ))}
    </div>
  );
}
