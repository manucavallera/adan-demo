"use client";

import { useTransition } from "react";
import { toggleChat } from "@/app/admin/(panel)/chats/actions";
import { btnGhost, btnPrimary } from "./ui";

export function ChatToggle({ jid, paused }: { jid: string; paused: boolean }) {
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => start(() => toggleChat(jid, !paused))}
      className={paused ? btnPrimary : btnGhost}
    >
      {paused ? "Reactivar el bot" : "Pausar el bot"}
    </button>
  );
}
