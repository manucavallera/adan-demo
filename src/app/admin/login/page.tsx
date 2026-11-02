import type { Metadata } from "next";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { checkPassword, isAdmin, startSession } from "@/lib/admin-auth";
import { store } from "@/lib/config";

export const metadata: Metadata = { title: `Panel | ${store.name}`, robots: { index: false } };

// Freno simple contra adivinar la contraseña: 10 intentos fallidos por IP cada 15 minutos.
const fails = ((globalThis as unknown as { __adminFails?: Map<string, { count: number; reset: number }> }).__adminFails ??=
  new Map());

async function login(formData: FormData) {
  "use server";
  const h = await headers();
  const ip = h.get("x-forwarded-for")?.split(",")[0].trim() || h.get("x-real-ip") || "local";
  const now = Date.now();
  let entry = fails.get(ip);
  if (!entry || now > entry.reset) {
    if (fails.size > 1000) fails.clear();
    entry = { count: 0, reset: now + 15 * 60_000 };
    fails.set(ip, entry);
  }
  if (entry.count >= 10) redirect("/admin/login?error=bloqueado");
  if (!checkPassword(String(formData.get("password") ?? ""))) {
    entry.count++;
    redirect("/admin/login?error=1");
  }
  await startSession();
  redirect("/admin");
}

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  if (await isAdmin()) redirect("/admin");
  const { error } = await searchParams;
  return (
    <main className="flex min-h-dvh items-center justify-center px-4">
      <form action={login} className="w-full max-w-sm space-y-5 border border-line bg-surface p-8">
        <div>
          <p className="font-display text-4xl uppercase">{store.name}</p>
          <h1 className="mt-1 text-muted">Panel de la tienda</h1>
        </div>
        <div className="flex flex-col gap-2">
          <label htmlFor="password" className="text-sm font-semibold">
            Contraseña
          </label>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
            autoFocus
            className="h-12 w-full border border-line bg-canvas px-4 text-base outline-none focus:border-ink"
          />
          {error && (
            <p role="alert" className="text-sm font-medium text-accent">
              {error === "bloqueado" ? "Demasiados intentos. Probá en 15 minutos." : "Contraseña incorrecta."}
            </p>
          )}
        </div>
        <button type="submit" className="h-12 w-full cursor-pointer bg-accent font-semibold text-on-accent">
          Entrar
        </button>
      </form>
    </main>
  );
}
