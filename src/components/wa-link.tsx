"use client";

import { store, waLink } from "@/lib/config";
import { openBot } from "./bot-demo";

// Link a WhatsApp. En la demo (número falso) abre el asistente de prueba con el mismo mensaje.
export function WaLink({
  message,
  className,
  children,
}: {
  message: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <a
      href={waLink(message)}
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
