"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/admin-auth";
import { setChatPaused } from "@/lib/whatsapp-bot";

export async function toggleChat(jid: string, paused: boolean) {
  await requireAdmin();
  await setChatPaused(jid, paused);
  revalidatePath("/admin", "layout");
}
