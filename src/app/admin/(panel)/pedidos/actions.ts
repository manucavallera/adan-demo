"use server";

import { revalidatePath } from "next/cache";
import type { OrderStatus } from "@prisma/client";
import { requireAdmin } from "@/lib/admin-auth";
import { prisma } from "@/lib/db";
import { OrderError, setOrderStatus } from "@/lib/orders";

const STATUSES: OrderStatus[] = ["PENDIENTE", "PAGADO", "ENVIADO", "ENTREGADO", "CANCELADO"];

export async function changeStatus(id: number, status: string): Promise<{ error?: string }> {
  await requireAdmin();
  if (!STATUSES.includes(status as OrderStatus)) return { error: "Estado inválido." };
  try {
    await setOrderStatus(id, status as OrderStatus);
  } catch (error) {
    if (error instanceof OrderError) return { error: error.message };
    throw error;
  }
  revalidatePath("/admin", "layout");
  return {};
}

export async function saveNotes(id: number, notes: string) {
  await requireAdmin();
  await prisma.order.update({ where: { id }, data: { notes: notes.slice(0, 1000) } });
  revalidatePath(`/admin/pedidos/${id}`);
}

export async function markWithdrawalHandled(id: number) {
  await requireAdmin();
  await prisma.withdrawal.update({ where: { id }, data: { handled: true } });
  revalidatePath("/admin/pedidos");
}
