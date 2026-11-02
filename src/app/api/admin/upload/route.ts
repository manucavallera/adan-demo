// Sube una foto de producto desde el panel. Devuelve la ruta para guardar en el producto.
import { isAdmin } from "@/lib/admin-auth";
import { saveImage } from "@/lib/uploads";

export const runtime = "nodejs";

const MAX = 15 * 1024 * 1024;

export async function POST(req: Request) {
  if (!(await isAdmin())) return Response.json({ error: "No autorizado" }, { status: 401 });
  let file: FormDataEntryValue | null;
  try {
    file = (await req.formData()).get("file");
  } catch {
    return Response.json({ error: "Archivo inválido" }, { status: 400 });
  }
  if (!(file instanceof File) || !file.type.startsWith("image/")) return Response.json({ error: "Tiene que ser una foto" }, { status: 400 });
  if (file.size > MAX) return Response.json({ error: "La foto pesa más de 15 MB" }, { status: 413 });
  try {
    return Response.json({ src: await saveImage(await file.arrayBuffer()) });
  } catch (error) {
    console.error("[panel] error al guardar foto", error);
    return Response.json({ error: "No se pudo procesar la foto. Probá con otra (JPG o PNG)." }, { status: 422 });
  }
}
