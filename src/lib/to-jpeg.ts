// Achica una foto en el navegador y la pasa a JPEG (data URL) antes de mandarla a la IA:
// más rápida y más barata. Recibe una URL de imagen o un archivo.
export async function toJpeg(src: string | File, max = 800): Promise<string> {
  const url = typeof src === "string" ? src : URL.createObjectURL(src);
  const img = document.createElement("img");
  img.src = url;
  await img.decode();
  const scale = Math.min(1, max / Math.max(img.naturalWidth, img.naturalHeight));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(img.naturalWidth * scale);
  canvas.height = Math.round(img.naturalHeight * scale);
  canvas.getContext("2d")!.drawImage(img, 0, 0, canvas.width, canvas.height);
  if (typeof src !== "string") URL.revokeObjectURL(url);
  return canvas.toDataURL("image/jpeg", 0.8);
}
