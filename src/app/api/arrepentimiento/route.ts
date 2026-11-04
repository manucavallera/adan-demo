// Botón de arrepentimiento: guarda el pedido, da un código de trámite y avisa al dueño.
import { store } from "@/lib/config";
import { prisma } from "@/lib/db";
import { notifyOwner } from "@/lib/wa";
import { withdrawalCode } from "@/lib/orders";

export const runtime = "nodejs";

const str = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");

export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const name = str(body.name, 80);
  const phone = str(body.phone, 30).replace(/\D/g, "");
  if (name.length < 3) return Response.json({ error: "Falta tu nombre y apellido." }, { status: 400 });
  if (phone.length < 8) return Response.json({ error: "Revisá tu número de WhatsApp." }, { status: 400 });

  const w = await prisma.withdrawal.create({
    data: {
      name,
      phone,
      email: str(body.email, 120),
      orderCode: str(body.orderCode, 20).toUpperCase(),
      reason: str(body.reason, 500),
    },
  });
  const code = withdrawalCode(w.id);

  const text = [
    `Arrepentimiento de compra en la web de ${store.name}: ${code}`,
    `${name} · wa.me/${phone}`,
    w.orderCode && `Pedido: ${w.orderCode}`,
    w.reason && `Devuelve: ${w.reason}`,
    "Hay que contestarle y coordinar la devolución. Está en el panel, en Pedidos.",
  ]
    .filter(Boolean)
    .join("\n");
  void notifyOwner(text);

  return Response.json({ code });
}
