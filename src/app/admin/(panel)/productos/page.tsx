import Image from "next/image";
import Link from "next/link";
import { prisma } from "@/lib/db";
import { categories } from "@/lib/products";
import { formatPrice } from "@/lib/config";
import { PageTitle, btnPrimary } from "@/components/admin/ui";
import { ActiveToggle, StockStepper } from "@/components/admin/stock-controls";

export default async function ProductsPage({ searchParams }: { searchParams: Promise<{ ok?: string }> }) {
  const { ok } = await searchParams;
  const products = await prisma.product.findMany({
    include: { variants: { orderBy: [{ sort: "asc" }, { id: "asc" }] } },
    orderBy: [{ sort: "asc" }, { createdAt: "asc" }],
  });
  const label = Object.fromEntries(categories.map((c) => [c.id, c.label]));

  return (
    <>
      <PageTitle title="Productos">
        <Link href="/admin/productos/nuevo" className={btnPrimary}>
          + Nueva prenda
        </Link>
      </PageTitle>
      {ok && <p className="mb-4 border border-emerald-600 p-3 text-sm">Guardado. Ya se ve en la web y el bot lo sabe.</p>}
      <p className="mb-4 text-sm text-muted">
        Tocá + o − para cambiar el stock. Con el botón de estado pausás una prenda: no se ve en la web y el bot no la ofrece.
      </p>
      <ul className="divide-y divide-line border-y border-line">
        {products.map((p) => (
          <li key={p.id} className="flex flex-col gap-3 py-4 md:flex-row md:items-center">
            <Link href={`/admin/productos/${p.id}`} className="flex min-w-0 flex-1 items-center gap-4">
              <div className="relative h-20 w-16 shrink-0 overflow-hidden bg-line">
                <Image src={p.images[0] ?? "/img/sin-foto.svg"} alt="" fill sizes="64px" className="object-cover" />
              </div>
              <div className="min-w-0">
                <p className="truncate font-semibold">{p.name}</p>
                <p className="text-sm text-muted">
                  {p.id} · {label[p.category] ?? p.category} · {formatPrice(p.price)}
                </p>
                <p className="text-xs text-accent underline">Editar</p>
              </div>
            </Link>
            <div className="flex flex-wrap items-center gap-2">
              {p.variants.map((v) => (
                <StockStepper key={v.id} id={v.id} name={p.name} size={v.size} stock={v.stock} />
              ))}
              <ActiveToggle id={p.id} active={p.active} />
            </div>
          </li>
        ))}
      </ul>
      {products.length === 0 && <p className="py-10 text-center text-muted">Todavía no hay prendas. Cargá la primera.</p>}
    </>
  );
}
