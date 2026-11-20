// Carga rápida de prendas: la IA mira las fotos y una línea de texto (escrita o dictada)
// y devuelve los datos para completar el formulario del panel. No guarda nada: el dueño
// revisa el formulario y toca Guardar.
import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { categories, CATEGORY_IDS } from "./products";

const client = new Anthropic();

export type QuickFill = {
  name: string;
  category: string;
  price: number; // 0 = no lo dijo
  oldPrice: number; // 0 = sin oferta
  description: string;
  colors: { name: string; hex: string; photos: number[] }[];
  sizes: string[];
  stock: { color: string; size: string; qty: number }[];
  missing: string[];
};

const S = { type: "string" } as const;
const SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["name", "category", "price", "oldPrice", "description", "colors", "sizes", "stock", "missing"],
  properties: {
    name: S,
    category: { type: "string", enum: [...CATEGORY_IDS] },
    price: { type: "integer" },
    oldPrice: { type: "integer" },
    description: S,
    colors: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["name", "hex", "photos"],
        properties: { name: S, hex: S, photos: { type: "array", items: { type: "integer" } } },
      },
    },
    sizes: { type: "array", items: S },
    stock: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["color", "size", "qty"],
        properties: { color: S, size: S, qty: { type: "integer" } },
      },
    },
    missing: { type: "array", items: { type: "string", enum: ["nombre", "precio", "talles", "stock", "color"] } },
  },
};

const PROMPT = `Ayudás al dueño de una tienda de ropa de hombre de Argentina a cargar prendas en su catálogo.
Te manda fotos de la prenda (numeradas desde 0, en el orden en que llegan) y una línea de texto, muchas veces dictada por voz, con errores o sin puntuación.
Devolvé los datos para el formulario:
- name: nombre corto y comercial en castellano, sin el color ni el talle (ej: "Remera oversize", "Pantalón de vestir slim").
- category: una de: ${categories.map((c) => `${c.id} (${c.label})`).join(", ")}.
- price: precio en pesos, entero. "25 mil", "25 lucas" o "25k" = 25000. Si no lo dijo, 0. Nunca lo inventes.
- oldPrice: si dice que está en oferta y da el precio de antes, ese precio. Si no, 0.
- description: 1 o 2 oraciones simples para la web: tela, calce, para qué ocasión. Usá lo que dijo y lo que se ve claro en la foto. No inventes marcas ni materiales que no se vean o no haya dicho.
- colors: los colores que dijo (o, si no dijo, el que se ve en la foto). Nombre con mayúscula ("Negro", "Azul marino"), hex aproximado, y en photos los números de las fotos donde aparece ese color. Si es un solo color, un solo elemento con todas las fotos.
- sizes: talles en orden. "S a XL" = S, M, L, XL. "del 38 al 46" = 38, 40, 42, 44, 46 (los pantalones van de a 2). Gorras y accesorios sin talle = "Único".
- stock: unidades por color y talle, solo lo que dijo. "3 de cada" vale para todos. Si no dijo cantidades, devolvé la lista vacía.
- missing: lo que no dijo y no se puede sacar de la foto: "nombre", "precio", "talles", "stock" o "color".`;

export async function quickFill(text: string, images: string[]): Promise<QuickFill> {
  const content: Anthropic.Beta.BetaContentBlockParam[] = images.map((img) => ({
    type: "image",
    source: { type: "base64", media_type: "image/jpeg", data: img.replace(/^data:image\/jpeg;base64,/, "") },
  }));
  content.push({ type: "text", text: text.trim() || "(no escribió nada, sacá lo que puedas de las fotos)" });

  const response = await client.beta.messages.create({
    model: "claude-opus-5-5",
    max_tokens: 3000,
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    output_config: { effort: "low", format: { type: "json_schema", schema: SCHEMA } },
    system: PROMPT,
    messages: [{ role: "user", content }],
  });
  if (response.stop_reason === "refusal") throw new Error("La IA no pudo leer eso.");
  const out = response.content.flatMap((b) => (b.type === "text" ? [b.text] : [])).join("");
  return JSON.parse(out) as QuickFill;
}
