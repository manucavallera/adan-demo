"use client";

import { store, waLink } from "@/lib/config";
import { openBot } from "./bot-demo";
import { useShop } from "./shop";

// Link a WhatsApp. En modo demo abre el asistente de prueba con el mismo mensaje.
export function WaLink({
  message,
  className,
  children,
}: {
  message: string;
  className?: string;
  children: React.ReactNode;
}) {
  const { settings } = useShop();
  return (
    <a
      href={waLink(settings.whatsapp, message)}
      target="_blank"
      rel="noopener noreferrer"
      className={className}
      onClick={(e) => {
        if (!store.demoBot) return;
        e.preventDefault();
        openBot(message);
      }}
    >
      {children}
    </a>
  );
}
