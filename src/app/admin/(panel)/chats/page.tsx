import Link from "next/link";
import { prisma } from "@/lib/db";
import { PAGE_SIZE, PageTitle, Pagination, dateAR, pageFrom } from "@/components/admin/ui";
import { ChatToggle } from "@/components/admin/chat-toggle";

export default async function ChatsPage({ searchParams }: { searchParams: Promise<{ p?: string }> }) {
  const params = await searchParams;
  const page = pageFrom(params.p);
  const [chats, total] = await Promise.all([
    prisma.botChat.findMany({ orderBy: { lastAt: "desc" }, skip: (page - 1) * PAGE_SIZE, take: PAGE_SIZE }),
    prisma.botChat.count(),
  ]);
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
            <li key={c.jid} className={`flex flex-col gap-3 border-l-4 py-4 pl-4 sm:flex-row sm:items-center ${paused ? "border-l-danger" : "border-l-transparent"}`}>
              <Link href={`/admin/chats/${encodeURIComponent(c.jid)}`} className="min-w-0 flex-1">
                <p className="font-medium">
                  {c.name || "Sin nombre"} {c.phone && <span className="text-sm text-muted">+{c.phone}</span>}
                </p>
                {paused ? (
                  <p className="mt-0.5 inline-block bg-danger-soft px-2 py-0.5 text-xs font-semibold text-danger">Bot pausado{c.handoff ? ` · ${c.handoff}` : ""}</p>
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
      <Pagination page={page} total={total} params={params} path="/admin/chats" />
      {chats.length === 0 && page === 1 && <p className="py-10 text-center text-muted">Todavía no hay charlas. Aparecen cuando alguien le escribe al WhatsApp de la tienda.</p>}
    </>
  );
}
