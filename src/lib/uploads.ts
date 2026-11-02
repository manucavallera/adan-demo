// Fotos que sube el dueño desde el panel. Se achican a 1600 px, se pasan a WebP y se guardan
// en UPLOAD_DIR (en Easypanel tiene que ser un volumen, si no se borran en cada deploy).
import "server-only";
import { randomUUID } from "node:crypto";
import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

export const UPLOAD_DIR = process.env.UPLOAD_DIR || path.join(process.cwd(), "data", "uploads");
const PUBLIC_PREFIX = "/uploads/";
const NAME_RE = /^[a-f0-9-]{36}\.webp$/;

export async function saveImage(data: ArrayBuffer) {
  const out = await sharp(Buffer.from(data))
    .rotate() // respeta la orientación de la foto del celular
    .resize({ width: 1600, height: 1600, fit: "inside", withoutEnlargement: true })
    .webp({ quality: 82 })
    .toBuffer();
  const name = `${randomUUID()}.webp`;
  await mkdir(UPLOAD_DIR, { recursive: true });
  await writeFile(path.join(UPLOAD_DIR, name), out);
  return `${PUBLIC_PREFIX}${name}`;
}

export async function readImage(name: string) {
  if (!NAME_RE.test(name)) return null;
  try {
    return await readFile(path.join(UPLOAD_DIR, name));
  } catch {
    return null;
  }
}

// Borra una foto subida. Las fotos de /img (las de la demo) no se tocan.
export async function deleteImage(src: string) {
  if (!src.startsWith(PUBLIC_PREFIX)) return;
  const name = src.slice(PUBLIC_PREFIX.length);
  if (!NAME_RE.test(name)) return;
  await unlink(path.join(UPLOAD_DIR, name)).catch(() => {});
}
