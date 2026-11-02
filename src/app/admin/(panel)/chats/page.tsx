import Link from "next/link";
import { prisma } from "@/lib/db";
import { PageTitle, dateAR } from "@/components/admin/ui";
import { ChatToggle } from "@/components/admin/chat-toggle";

export default async function ChatsPage() {
  const chats = await prisma.botChat.findMany({ orderBy: { lastAt: "desc" }, take: 100 });
  const now = new Date();

  return (
    <>
      <PageTitle title="Chats del bot" />
      <p className="mb-5 max-w-[65ch] text-sm text-muted">
        Las charlas de WhatsApp que atendió el bot. Si escribís a mano en un chat, el bot se calla ahí 12 horas. Desde acá lo
        pausás o lo reactivás cuando quieras.
      </p>
      <ul className="divide-y divide-line border-y border-line">
        {chats.map((c) => {
          const paused = !!c.pausedUntil && c.pausedUntil > now;
          const history = c.history as { role: string; text: string }[];
          const last = history[history.length - 1];
          return (
            <li key={c.jid} className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center">
              <Link href={`/admin/chats/${encodeURIComponent(c.jid)}`} className="min-w-0 flex-1">
                <p className="font-medium">
                  {c.name || "Sin nombre"} {c.phone && <span className="text-sm text-muted">+{c.phone}</span>}
                </p>
                {paused ? (
                  <p className="text-sm font-medium text-accent">Bot pausado{c.handoff ? `: ${c.handoff}` : ""}</p>
                ) : (
                  <p className="truncate text-sm text-muted">{last ? `${last.role === "user" ? "" : "Bot: "}${last.text}` : "Sin mensajes"}</p>
                )}
                <p className="text-xs text-muted">{dateAR(c.lastAt)}</p>
              </Link>
              <ChatToggle jid={c.jid} paused={paused} />
            </li>
          );
        })}
      </ul>
      {chats.length === 0 && <p className="py-10 text-center text-muted">Todavía no hay charlas. Aparecen cuando alguien le escribe al WhatsApp de la tienda.</p>}
    </>
  );
}
