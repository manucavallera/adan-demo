"use client";

import Image from "next/image";
import { Fragment, useRef } from "react";
import { motion, useScroll, useTransform } from "motion/react";
import { Asterisk } from "@phosphor-icons/react";

const ease = [0.16, 1, 0.3, 1] as const;

// Título del hero: cada palabra sube desde abajo, una detrás de otra.
export function HeroTitle({
  text,
  className,
}: {
  text: string;
  className?: string;
}) {
  const words = text.split(" ");
  return (
    <h1 className={className} aria-label={text}>
      {words.map((w, i) => (
        <Fragment key={i}>
          <span
            aria-hidden
            className="inline-block overflow-hidden pt-[0.14em] align-bottom"
          >
            <motion.span
              className="inline-block"
              initial={{ y: "110%" }}
              animate={{ y: 0 }}
              transition={{ duration: 0.9, delay: 0.1 + i * 0.08, ease }}
            >
              {w}
            </motion.span>
          </span>{" "}
        </Fragment>
      ))}
    </h1>
  );
}

// Foto del hero: se descubre de abajo hacia arriba y después acompaña el scroll.
export function HeroImage({ src, alt }: { src: string; alt: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start start", "end start"],
  });
  const y = useTransform(scrollYProgress, [0, 1], ["0%", "18%"]);

  return (
    <motion.div
      ref={ref}
      className="relative aspect-[4/5] max-h-[78dvh] w-full overflow-hidden bg-line"
      initial={{ clipPath: "inset(100% 0% 0% 0%)" }}
      animate={{ clipPath: "inset(0% 0% 0% 0%)" }}
      transition={{ duration: 1.2, delay: 0.25, ease }}
    >
      <motion.div
        className="absolute inset-[-10%_0]"
        style={{ y }}
        initial={{ scale: 1.25 }}
        animate={{ scale: 1 }}
        transition={{ duration: 1.8, delay: 0.25, ease }}
      >
        <Image
          src={src}
          alt={alt}
          fill
          priority
          sizes="(min-width: 768px) 42vw, 100vw"
          className="object-cover"
        />
      </motion.div>
    </motion.div>
  );
}

// Imagen que se mueve más lento o más rápido que la página al scrollear.
export function Parallax({
  children,
  speed = 60,
  className,
}: {
  children: React.ReactNode;
  speed?: number;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  });
  const y = useTransform(scrollYProgress, [0, 1], [speed, -speed]);
  return (
    <motion.div ref={ref} style={{ y }} className={className}>
      {children}
    </motion.div>
  );
}

// Cinta con los beneficios de la tienda, corriendo de forma continua.
export function Marquee({ items }: { items: string[] }) {
  const row = (hidden?: boolean) => (
    <div aria-hidden={hidden} className="flex shrink-0 items-center gap-8 pr-8">
      {items.map((t) => (
        <span key={t} className="flex items-center gap-8 whitespace-nowrap">
          <span className="font-display text-3xl uppercase md:text-5xl">
            {t}
          </span>
          <Asterisk size={28} weight="bold" className="shrink-0" />
        </span>
      ))}
    </div>
  );
  return (
    <div className="marquee overflow-hidden border-y border-line bg-accent py-5 text-on-accent">
      <div className="marquee-track flex w-max">
        {row()}
        {row(true)}
      </div>
    </div>
  );
}
