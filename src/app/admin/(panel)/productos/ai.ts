"use server";

import { requireAdmin } from "@/lib/admin-auth";
import { quickFill, type QuickFill } from "@/lib/quick-fill";

const IMG_RE = /^data:image\/jpeg;base64,[A-Za-z0-9+/=]+$/;

// Carga rápida: arma los datos de la prenda con IA. No guarda nada.
export async function fillWithAI(text: string, images: string[]): Promise<{ data?: QuickFill; error?: string }> {
  await requireAdmin();
  const imgs = images.slice(0, 4);
  if (!text.trim() && imgs.length === 0) return { error: "Subí una foto o escribí algo de la prenda." };
  if (text.length > 1000) return { error: "El texto es muy largo." };
  if (imgs.some((i) => !IMG_RE.test(i) || i.length > 400_000)) return { error: "Una foto no se pudo leer." };
  try {
    return { data: await quickFill(text, imgs) };
  } catch (e) {
    console.error("carga rápida", e);
    return { error: "La IA no respondió. Probá de nuevo o cargá a mano." };
  }
}
