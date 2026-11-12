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
  PENDIENTE: "bg-warn-soft text-warn",
  PAGADO: "bg-ok-soft text-ok",
  ENVIADO: "bg-info-soft text-info",
  ENTREGADO: "bg-line text-muted",
  CANCELADO: "bg-danger-soft text-danger",
};

// Raya de color a la izquierda de cada pedido en la lista.
export const STATUS_BAR: Record<string, string> = {
  PENDIENTE: "border-l-warn",
  PAGADO: "border-l-ok",
  ENVIADO: "border-l-info",
  ENTREGADO: "border-l-line",
  CANCELADO: "border-l-danger",
};

const NOTICE_STYLE = {
  ok: "border-ok bg-ok-soft text-ok",
  warn: "border-warn bg-warn-soft text-warn",
  danger: "border-danger bg-danger-soft text-danger",
  info: "border-info bg-info-soft text-info",
} as const;

// Aviso en franja de color: verde = listo, ámbar = falta algo, rojo = urgente.
export function Notice({ tone, icon, children, className = "" }: { tone: keyof typeof NOTICE_STYLE; icon?: React.ReactNode; children: React.ReactNode; className?: string }) {
  return (
    <div role={tone === "danger" ? "alert" : "status"} className={`flex items-start gap-3 border-l-4 p-3 text-sm ${NOTICE_STYLE[tone]} ${className}`}>
      {icon && <span className="mt-0.5 shrink-0">{icon}</span>}
      <div className="min-w-0 flex-1 text-ink">{children}</div>
    </div>
  );
}

export const STATUS_LABEL: Record<string, string> = {
  PENDIENTE: "Pendiente de pago",
  PAGADO: "Pagado",
  ENVIADO: "Enviado",
  ENTREGADO: "Entregado",
  CANCELADO: "Cancelado",
};

export function StatusBadge({ status }: { status: string }) {
  return <span className={`inline-block whitespace-nowrap px-2 py-0.5 text-xs font-semibold ${STATUS_STYLE[status] ?? ""}`}>{STATUS_LABEL[status] ?? status}</span>;
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
