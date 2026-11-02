// Sirve las fotos que subió el dueño desde el panel.
import sharp from "sharp";
import { readImage } from "@/lib/uploads";

export const runtime = "nodejs";

// Con ?jpg=1 la devuelve en JPG: es lo que manda el bot por WhatsApp (las WebP a veces llegan como sticker).
export async function GET(req: Request, { params }: { params: Promise<{ name: string }> }) {
  const file = await readImage((await params).name);
  if (!file) return new Response("No encontrada", { status: 404 });
  const jpg = new URL(req.url).searchParams.get("jpg") === "1";
  const body = jpg ? await sharp(file).jpeg({ quality: 85 }).toBuffer() : file;
  return new Response(new Uint8Array(body), {
    headers: {
      "Content-Type": jpg ? "image/jpeg" : "image/webp",
      // El nombre es único por foto, así que se puede guardar en caché para siempre.
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
