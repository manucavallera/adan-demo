// Acceso al panel del dueño: una contraseña (ADMIN_PASSWORD) y una cookie firmada que dura 30 días.
// La firma usa ADMIN_SECRET; si cambia la contraseña o el secreto, se cierran todas las sesiones.
import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

const COOKIE = "adan_admin";
const DAYS = 30;

function secret() {
  const pass = process.env.ADMIN_PASSWORD;
  const key = process.env.ADMIN_SECRET;
  if (!pass || !key) throw new Error("Faltan ADMIN_PASSWORD o ADMIN_SECRET");
  return `${key}:${pass}`;
}

function sign(value: string) {
  return createHmac("sha256", secret()).update(value).digest("base64url");
}

function same(a: string, b: string) {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}

export function checkPassword(input: string) {
  const pass = process.env.ADMIN_PASSWORD;
  return !!pass && same(input, pass);
}

export async function startSession() {
  const exp = String(Date.now() + DAYS * 86_400_000);
  (await cookies()).set(COOKIE, `${exp}.${sign(exp)}`, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: DAYS * 86_400,
  });
}

export async function endSession() {
  (await cookies()).delete(COOKIE);
}

export async function isAdmin() {
  const value = (await cookies()).get(COOKIE)?.value;
  if (!value) return false;
  const [exp, sig] = value.split(".");
  if (!exp || !sig || Number(exp) < Date.now()) return false;
  try {
    return same(sig, sign(exp));
  } catch {
    return false;
  }
}

// Para páginas y acciones del panel: si no entró, lo manda al login.
export async function requireAdmin() {
  if (!(await isAdmin())) redirect("/admin/login");
}
