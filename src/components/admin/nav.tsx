"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

// En celular "Chats del bot" se acorta para que entren las 5 pestañas sin deslizar.
const LINKS: { href: string; label: string; short?: string }[] = [
  { href: "/admin", label: "Inicio" },
  { href: "/admin/pedidos", label: "Pedidos" },
  { href: "/admin/productos", label: "Productos" },
  { href: "/admin/chats", label: "Chats del bot", short: "Chats" },
  { href: "/admin/ajustes", label: "Ajustes" },
];

export function AdminNav() {
  const path = usePathname();
  return (
    <nav aria-label="Panel" className="no-scrollbar mx-auto flex max-w-6xl overflow-x-auto px-1 sm:gap-1 sm:px-4 md:px-8">
      {LINKS.map((l) => {
        const on = l.href === "/admin" ? path === "/admin" : path.startsWith(l.href);
        return (
          <Link
            key={l.href}
            href={l.href}
            aria-current={on ? "page" : undefined}
            className={`flex h-11 shrink-0 items-center border-b-2 px-2 text-[13px] font-medium sm:px-3 sm:text-sm ${
              on ? "border-accent text-ink" : "border-transparent text-muted hover:text-ink"
            }`}
          >
            {l.short ? (
              <>
                <span className="sm:hidden">{l.short}</span>
                <span className="hidden sm:inline">{l.label}</span>
              </>
            ) : (
              l.label
            )}
          </Link>
        );
      })}
    </nav>
  );
}
