// Piezas visuales chicas que comparten las pantallas del panel.
export const input =
  "h-11 w-full border border-line bg-canvas px-3 text-base text-ink outline-none focus:border-ink disabled:opacity-60";
export const btn =
  "inline-flex h-11 cursor-pointer items-center justify-center gap-2 px-5 text-sm font-semibold transition-transform active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60";
export const btnPrimary = `${btn} bg-accent text-on-accent`;
export const btnGhost = `${btn} border border-line hover:border-ink`;

export function PageTitle({ title, children }: { title: string; children?: React.ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
      <h1 className="font-display text-4xl uppercase">{title}</h1>
      {children}
    </div>
  );
}

export function Field({ label, hint, htmlFor, children }: { label: string; hint?: string; htmlFor?: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={htmlFor} className="text-sm font-semibold">
        {label}
      </label>
      {children}
      {hint && <p className="text-xs text-muted">{hint}</p>}
    </div>
  );
}

const STATUS_STYLE: Record<string, string> = {
  PENDIENTE: "bg-amber-100 text-amber-900 dark:bg-amber-900/40 dark:text-amber-200",
  PAGADO: "bg-emerald-100 text-emerald-900 dark:bg-emerald-900/40 dark:text-emerald-200",
  ENVIADO: "bg-sky-100 text-sky-900 dark:bg-sky-900/40 dark:text-sky-200",
  ENTREGADO: "bg-line text-ink",
  CANCELADO: "bg-red-100 text-red-900 dark:bg-red-900/40 dark:text-red-200",
};

export const STATUS_LABEL: Record<string, string> = {
  PENDIENTE: "Pendiente de pago",
  PAGADO: "Pagado",
  ENVIADO: "Enviado",
  ENTREGADO: "Entregado",
  CANCELADO: "Cancelado",
};

export function StatusBadge({ status }: { status: string }) {
  return <span className={`inline-block px-2 py-0.5 text-xs font-semibold ${STATUS_STYLE[status] ?? ""}`}>{STATUS_LABEL[status] ?? status}</span>;
}

export function dateAR(d: Date) {
  return new Intl.DateTimeFormat("es-AR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "America/Argentina/Buenos_Aires",
  }).format(d);
}
