"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/admin", label: "Inicio" },
  { href: "/admin/pedidos", label: "Pedidos" },
  { href: "/admin/productos", label: "Productos" },
  { href: "/admin/chats", label: "Chats del bot" },
  { href: "/admin/ajustes", label: "Ajustes" },
];

export function AdminNav() {
  const path = usePathname();
  return (
    <nav aria-label="Panel" className="no-scrollbar mx-auto flex max-w-6xl gap-1 overflow-x-auto px-4 md:px-8">
      {LINKS.map((l) => {
        const on = l.href === "/admin" ? path === "/admin" : path.startsWith(l.href);
        return (
          <Link
            key={l.href}
            href={l.href}
            aria-current={on ? "page" : undefined}
            className={`flex h-11 shrink-0 items-center border-b-2 px-3 text-sm font-medium ${
              on ? "border-accent text-ink" : "border-transparent text-muted hover:text-ink"
            }`}
          >
            {l.label}
          </Link>
        );
      })}
    </nav>
  );
}
