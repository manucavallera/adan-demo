// Pedidos: se crean desde el checkout de la web y el dueño los maneja desde el panel.
// El stock se reserva al crear el pedido y vuelve si el pedido se cancela.
import "server-only";
import type { OrderStatus } from "@prisma/client";
import { formatPrice, shippingFor, store } from "./config";
import { prisma } from "./db";
import { sendText } from "./evolution";
import { getShop, revalidateShop } from "./shop";

export type NewOrder = {
  name: string;
  phone: string;
  delivery: "envio" | "retiro";
  address: string;
  city: string;
  zip: string;
  payment: "mercadopago" | "transferencia" | "efectivo";
  items: { id: string; size: string; qty: number }[];
};

export class OrderError extends Error {}

export const PAYMENT_LABEL: Record<string, string> = {
  mercadopago: "Mercado Pago",
  transferencia: "Transferencia",
  efectivo: "Efectivo al retirar",
};

export function orderCode(id: number) {
  return `AD-${String(id).padStart(4, "0")}`;
}

export async function createOrder(input: NewOrder) {
  const { products, settings } = await getShop();

  // Los precios salen siempre de la base, nunca de lo que manda el navegador.
  const items = input.items.map((it) => {
    const p = products.find((x) => x.id === it.id);
    if (!p || !p.sizes.includes(it.size)) throw new OrderError("Una prenda del carrito ya no está disponible.");
    return { productId: p.id, name: p.name, size: it.size, qty: it.qty, price: p.price };
  });

  const subtotal = items.reduce((s, it) => s + it.price * it.qty, 0);
  const shipping = input.delivery === "retiro" ? 0 : shippingFor(subtotal, settings);
  const discount =
    input.payment === "transferencia" && settings.transferDiscount > 0
      ? Math.round((subtotal * settings.transferDiscount) / 100)
      : 0;
  const total = subtotal - discount + shipping;

  const order = await prisma.$transaction(async (tx) => {
    // Reserva el stock solo si alcanza (evita vender dos veces la última unidad).
    for (const it of items) {
      const { count } = await tx.variant.updateMany({
        where: { productId: it.productId, size: it.size, stock: { gte: it.qty } },
        data: { stock: { decrement: it.qty } },
      });
      if (count === 0) throw new OrderError(`No queda stock de ${it.name} talle ${it.size}.`);
    }
    return tx.order.create({
      data: {
        name: input.name,
        phone: input.phone,
        delivery: input.delivery,
        address: input.delivery === "envio" ? input.address : "",
        city: input.delivery === "envio" ? input.city : "",
        zip: input.delivery === "envio" ? input.zip : "",
        payment: input.payment,
        subtotal,
        shipping,
        discount,
        total,
        stockApplied: true,
        items: { create: items },
      },
      include: { items: true },
    });
  });

  revalidateShop();
  void notifyNewOrder(order);
  return order;
}

type FullOrder = Awaited<ReturnType<typeof getOrder>> & {};

export function getOrder(id: number) {
  return prisma.order.findUnique({ where: { id }, include: { items: true } });
}

// Cambia el estado. Si se cancela, devuelve el stock; si se reactiva, lo vuelve a reservar.
export async function setOrderStatus(id: number, status: OrderStatus) {
  await prisma.$transaction(async (tx) => {
    const order = await tx.order.findUnique({ where: { id }, include: { items: true } });
    if (!order) throw new OrderError("El pedido no existe.");
    let stockApplied = order.stockApplied;
    if (status === "CANCELADO" && order.stockApplied) {
      for (const it of order.items) {
        await tx.variant.updateMany({
          where: { productId: it.productId, size: it.size },
          data: { stock: { increment: it.qty } },
        });
      }
      stockApplied = false;
    } else if (status !== "CANCELADO" && !order.stockApplied) {
      for (const it of order.items) {
        const { count } = await tx.variant.updateMany({
          where: { productId: it.productId, size: it.size, stock: { gte: it.qty } },
          data: { stock: { decrement: it.qty } },
        });
        if (count === 0) throw new OrderError(`No hay stock de ${it.name} talle ${it.size} para reactivar el pedido.`);
      }
      stockApplied = true;
    }
    await tx.order.update({ where: { id }, data: { status, stockApplied } });
  });
  revalidateShop();
}

async function notifyNewOrder(order: NonNullable<FullOrder>) {
  const owner = process.env.OWNER_WHATSAPP?.replace(/\D/g, "");
  if (!owner || !process.env.EVOLUTION_URL) return;
  const lines = [
    `Pedido nuevo en la web de ${store.name}: ${orderCode(order.id)}`,
    `${order.name} · wa.me/${order.phone}`,
    ...order.items.map((it) => `- ${it.qty} x ${it.name} talle ${it.size}`),
    order.delivery === "envio" ? `Envío a ${order.address}, ${order.city} (${order.zip})` : "Retira en el local",
    `Pago: ${PAYMENT_LABEL[order.payment] ?? order.payment}`,
    `Total: ${formatPrice(order.total)}`,
  ];
  try {
    await sendText(owner, lines.join("\n"), 0);
  } catch (error) {
    console.error("[pedidos] no se pudo avisar al dueño", error);
  }
}
