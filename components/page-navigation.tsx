import Link from "next/link";

function Chevron({ forward = false }: { forward?: boolean }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="shrink-0">
      <path d={forward ? "m9 5 7 7-7 7" : "m15 5-7 7 7 7"} />
    </svg>
  );
}

export function BackToDashboard() {
  return (
    <Link href="/dashboard" className="inline-flex min-h-11 items-center gap-1.5 rounded-xl border border-border bg-muted px-3 text-sm font-semibold transition-colors hover:bg-primary/10 hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary">
      <Chevron />
      Kembali ke beranda
    </Link>
  );
}

export function MonthNavigation({ label, month, previousHref, nextHref }: {
  label: string;
  month: string;
  previousHref: string;
  nextHref: string;
}) {
  const linkClass = "flex min-h-11 min-w-11 items-center justify-center gap-2 rounded-xl px-2 text-primary transition-colors hover:bg-card focus-visible:outline-2 focus-visible:outline-primary sm:px-3";

  return (
    <nav aria-label={label} className="flex items-center justify-between gap-2 rounded-2xl border border-border bg-muted p-1.5 text-sm">
      <Link href={previousHref} aria-label="Bulan sebelumnya" className={linkClass}>
        <Chevron />
        <span className="hidden sm:inline">Sebelumnya</span>
      </Link>
      <div className="min-w-0 text-center">
        <p className="text-[11px] text-muted-foreground">Bulan yang ditampilkan</p>
        <p className="font-semibold">{month}</p>
      </div>
      <Link href={nextHref} aria-label="Bulan berikutnya" className={linkClass}>
        <span className="hidden sm:inline">Berikutnya</span>
        <Chevron forward />
      </Link>
    </nav>
  );
}
