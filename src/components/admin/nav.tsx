"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChatsCircle, Gear, House, Package, TShirt, type Icon } from "@phosphor-icons/react";

// En celular cada pestaña muestra el ícono arriba y una palabra abajo, así entran las 5 sin deslizar.
const LINKS: { href: string; label: string; short?: string; icon: Icon }[] = [
  { href: "/admin", label: "Inicio", icon: House },
  { href: "/admin/pedidos", label: "Pedidos", icon: Package },
  { href: "/admin/productos", label: "Productos", icon: TShirt },
  { href: "/admin/chats", label: "Chats del bot", short: "Chats", icon: ChatsCircle },
  { href: "/admin/ajustes", label: "Ajustes", icon: Gear },
];

export function AdminNav() {
  const path = usePathname();
  return (
    <nav aria-label="Panel" className="mx-auto grid max-w-6xl grid-cols-5 px-1 sm:flex sm:gap-1 sm:px-4 md:px-8">
      {LINKS.map((l) => {
        const on = l.href === "/admin" ? path === "/admin" : path.startsWith(l.href);
        const I = l.icon;
        return (
          <Link
            key={l.href}
            href={l.href}
            aria-current={on ? "page" : undefined}
            className={`flex h-14 min-w-0 flex-col items-center justify-center gap-0.5 border-b-[3px] px-1 text-[11px] font-medium sm:h-12 sm:flex-row sm:gap-2 sm:px-3 sm:text-sm ${
              on ? "border-accent font-semibold text-accent" : "border-transparent text-muted hover:text-ink"
            }`}
          >
            <I size={20} weight={on ? "fill" : "regular"} aria-hidden className="shrink-0" />
            {l.short ? (
              <>
                <span className="truncate sm:hidden">{l.short}</span>
                <span className="hidden sm:inline">{l.label}</span>
              </>
            ) : (
              <span className="truncate">{l.label}</span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}
