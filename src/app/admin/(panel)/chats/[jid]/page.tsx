import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { waLink } from "@/lib/config";
import { dateAR } from "@/components/admin/ui";
import { ChatToggle } from "@/components/admin/chat-toggle";

export default async function ChatPage({ params }: { params: Promise<{ jid: string }> }) {
  const jid = decodeURIComponent((await params).jid);
  const chat = await prisma.botChat.findUnique({ where: { jid } });
  if (!chat) notFound();
  const paused = !!chat.pausedUntil && chat.pausedUntil > new Date();
  const history = chat.history as { role: "user" | "assistant"; text: string }[];

  return (
    <>
      <Link href="/admin/chats" className="mb-4 inline-flex h-10 items-center text-sm text-muted hover:text-ink">
        ← Volver a chats
      </Link>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-4xl uppercase">{chat.name || "Sin nombre"}</h1>
          <p className="text-sm text-muted">
            {chat.phone && `+${chat.phone} · `}último mensaje {dateAR(chat.lastAt)}
          </p>
          {paused && <p className="mt-1 text-sm font-medium text-accent">Bot pausado{chat.handoff ? `: ${chat.handoff}` : ""}</p>}
        </div>
        <div className="flex flex-wrap gap-2">
          {chat.phone && (
            <a href={waLink(chat.phone, "")} target="_blank" rel="noopener noreferrer" className="inline-flex h-11 items-center bg-[#25d366] px-4 text-sm font-semibold text-[#0b1f12]">
              Abrir en WhatsApp
            </a>
          )}
          <ChatToggle jid={chat.jid} paused={paused} />
        </div>
      </div>
      <p className="mb-3 text-xs text-muted">Se muestran los últimos mensajes que recuerda el bot. Lo que escribiste vos a mano no aparece acá.</p>
      <ol className="max-w-2xl space-y-2 bg-surface p-4">
        {history.map((m, i) => (
          <li key={i} className={`max-w-[85%] whitespace-pre-wrap px-3 py-2 text-sm ${m.role === "user" ? "bg-canvas" : "ml-auto bg-accent text-on-accent"}`}>
            {m.text}
          </li>
        ))}
        {history.length === 0 && <li className="text-sm text-muted">Sin mensajes guardados.</li>}
      </ol>
    </>
  );
}
