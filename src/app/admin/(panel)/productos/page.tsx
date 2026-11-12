import Image from "next/image";
import Link from "next/link";
import { prisma } from "@/lib/db";
import { categories, discountOf, parseColors, type ProductColor } from "@/lib/products";
import { formatPrice } from "@/lib/config";
import type { Prisma } from "@prisma/client";
import { CheckCircle, MagnifyingGlass } from "@phosphor-icons/react/dist/ssr";
import { Notice, PAGE_SIZE, PageTitle, Pagination, btnGhost, btnPrimary, input, pageFrom } from "@/components/admin/ui";
import { ActiveToggle, StockStepper } from "@/components/admin/stock-controls";

// Agrupa el stock por color, en el orden de los colores de la prenda.
function groupByColor<V extends { color: string }>(variants: V[], colors: ProductColor[]) {
  const names = colors.length ? colors.map((c) => c.name) : [""];
  return names.map((color) => ({
    color,
    hex: colors.find((c) => c.name === color)?.hex,
    variants: variants.filter((v) => v.color === color),
  }));
}

// Filtros de estado de la lista. Agotada = ningún talle con stock; poco stock = algún talle con 0 o 1.
const STATES: { id: string; label: string; where: Prisma.ProductWhereInput }[] = [
  { id: "", label: "Todas", where: {} },
  { id: "poco", label: "Poco stock", where: { variants: { some: { stock: { lte: 1 } } } } },
  { id: "agotadas", label: "Agotadas", where: { variants: { none: { stock: { gt: 0 } } } } },
  { id: "ofertas", label: "En oferta", where: { oldPrice: { gt: 0 } } },
  { id: "pausadas", label: "Pausadas", where: { active: false } },
];

type Params = { ok?: string; q?: string; cat?: string; ver?: string; p?: string };

export default async function ProductsPage({ searchParams }: { searchParams: Promise<Params> }) {
  const params = await searchParams;
  const { ok } = params;
  const q = (params.q ?? "").trim().slice(0, 60);
  const cat = categories.some((c) => c.id === params.cat) ? params.cat! : "";
  const state = STATES.find((s) => s.id === params.ver) ?? STATES[0];
  const page = pageFrom(params.p);

  const where: Prisma.ProductWhereInput = {
    AND: [
      q ? { OR: [{ name: { contains: q, mode: "insensitive" } }, { id: { contains: q, mode: "insensitive" } }] } : {},
      cat ? { category: cat } : {},
      state.where,
    ],
  };
  const [products, total, all] = await Promise.all([
    prisma.product.findMany({
      where,
      include: { variants: { orderBy: [{ sort: "asc" }, { id: "asc" }] } },
      orderBy: [{ sort: "asc" }, { createdAt: "asc" }],
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    prisma.product.count({ where }),
    prisma.product.count(),
  ]);
  const label = Object.fromEntries(categories.map((c) => [c.id, c.label]));
  const filtered = Boolean(q || cat || state.id);
  // Solo las categorías que tienen prendas, para que el desplegable no sea eterno.
  const usedCats = await prisma.product.groupBy({ by: ["category"] });
  const catOptions = categories.filter((c) => usedCats.some((u) => u.category === c.id));
  const stateHref = (id: string) => {
    const u = new URLSearchParams();
    if (q) u.set("q", q);
    if (cat) u.set("cat", cat);
    if (id) u.set("ver", id);
    const s = u.toString();
    return s ? `/admin/productos?${s}` : "/admin/productos";
  };

  return (
    <>
      <PageTitle title="Productos">
        <Link href="/admin/productos/nuevo" className={btnPrimary}>
          + Nueva prenda
        </Link>
      </PageTitle>
      {ok && <Notice tone="ok" icon={<CheckCircle size={20} weight="fill" />} className="mb-4">Guardado. Ya se ve en la web y el bot lo sabe.</Notice>}
      <p className="mb-4 text-sm text-muted">
        Tocá + o − para cambiar el stock. Con el botón de estado pausás una prenda: no se ve en la web y el bot no la ofrece.
      </p>
      {all > 0 && (
        <form action="/admin/productos" className="mb-3 flex flex-wrap gap-2">
          {state.id && <input type="hidden" name="ver" value={state.id} />}
          <label className="relative min-w-0 flex-1 basis-56">
            <span className="sr-only">Buscar prenda</span>
            <MagnifyingGlass size={18} aria-hidden className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-muted" />
            <input type="search" name="q" defaultValue={q} placeholder="Buscar por nombre o código" className={`${input} pl-10`} />
          </label>
          <label className="min-w-0 flex-1 basis-40">
            <span className="sr-only">Categoría</span>
            <select name="cat" defaultValue={cat} className={input}>
              <option value="">Todas las categorías</option>
              {catOptions.map((c) => (
                <option key={c.id} value={c.id}>{c.label}</option>
              ))}
            </select>
          </label>
          <button type="submit" className={btnGhost}>Buscar</button>
        </form>
      )}
      {all > 0 && (
        <div className="no-scrollbar mb-5 flex gap-2 overflow-x-auto">
          {STATES.map((s) => (
            <Link
              key={s.id}
              href={stateHref(s.id)}
              className={`flex h-10 shrink-0 items-center border px-4 text-sm ${s.id === state.id ? "border-accent bg-accent text-on-accent" : "border-line hover:border-ink"}`}
            >
              {s.label}
            </Link>
          ))}
        </div>
      )}
      {filtered && (
        <p className="mb-3 text-sm text-muted">
          {total === 1 ? "1 prenda" : `${total} prendas`} · <Link href="/admin/productos" className="font-semibold text-ink underline">Sacar filtros</Link>
        </p>
      )}
      <ul className="divide-y divide-line border-y border-line">
        {products.map((p) => (
          <li key={p.id} className={`flex flex-col gap-3 py-4 md:flex-row md:items-center ${p.active ? "" : "opacity-60"}`}>
            <Link href={`/admin/productos/${p.id}`} className="flex min-w-0 flex-1 items-center gap-4">
              <div className="relative h-20 w-16 shrink-0 overflow-hidden bg-line">
                <Image src={p.images[0] ?? "/img/sin-foto.svg"} alt="" fill sizes="64px" className="object-cover" />
              </div>
              <div className="min-w-0">
                <p className="truncate font-semibold">{p.name}</p>
                <p className="text-sm text-muted">
                  {p.id} · {label[p.category] ?? p.category} · {formatPrice(p.price)}
                  {discountOf(p) > 0 && <span className="ml-2 bg-danger-soft px-1.5 py-0.5 text-xs font-semibold text-danger">Oferta −{discountOf(p)}%</span>}
                </p>
                <p className="text-xs text-accent underline">Editar</p>
              </div>
            </Link>
            <div className="flex flex-col gap-2 md:items-end">
              {groupByColor(p.variants, parseColors(p.colors)).map((g) => (
                <div key={g.color} className="flex flex-wrap items-center gap-2 md:justify-end">
                  {g.color && (
                    <span className="flex w-full items-center gap-1.5 text-xs font-semibold md:w-auto">
                      <span className="size-3 rounded-full border border-ink/15" style={{ background: g.hex }} />
                      {g.color}
                    </span>
                  )}
                  {g.variants.map((v) => (
                    <StockStepper key={v.id} id={v.id} name={`${p.name}${v.color ? ` ${v.color}` : ""}`} size={v.size} stock={v.stock} />
                  ))}
                </div>
              ))}
              <div className="self-start md:self-end">
                <ActiveToggle id={p.id} active={p.active} />
              </div>
            </div>
          </li>
        ))}
      </ul>
      {products.length === 0 && (
        <p className="py-10 text-center text-muted">{all === 0 ? "Todavía no hay prendas. Cargá la primera." : "No hay prendas con ese filtro."}</p>
      )}
      <Pagination page={page} total={total} params={params} path="/admin/productos" />
    </>
  );
}
