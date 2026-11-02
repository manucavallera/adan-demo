import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { endSession, requireAdmin } from "@/lib/admin-auth";
import { store } from "@/lib/config";
import { AdminNav } from "@/components/admin/nav";

export const metadata: Metadata = { title: `Panel | ${store.name}`, robots: { index: false } };
export const dynamic = "force-dynamic";

async function logout() {
  "use server";
  await endSession();
  redirect("/admin/login");
}

export default async function PanelLayout({ children }: { children: React.ReactNode }) {
  await requireAdmin();
  return (
    <div className="min-h-dvh">
      <header className="sticky top-0 z-30 border-b border-line bg-canvas/95 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-4 px-4 md:px-8">
          <Link href="/admin" className="font-display text-2xl uppercase">
            {store.name} <span className="font-sans text-sm normal-case text-muted">panel</span>
          </Link>
          <div className="flex items-center gap-4 text-sm">
            <Link href="/" target="_blank" className="text-muted hover:text-ink">
              Ver la web
            </Link>
            <form action={logout}>
              <button type="submit" className="cursor-pointer text-muted hover:text-ink">
                Salir
              </button>
            </form>
          </div>
        </div>
        <AdminNav />
      </header>
      <main className="mx-auto max-w-6xl px-4 py-8 md:px-8">{children}</main>
    </div>
  );
}
