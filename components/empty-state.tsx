import Link from "next/link";

export function EmptyState({ title, description, href, action }: {
  title: string;
  description: string;
  href: string;
  action: string;
}) {
  return (
    <div className="rounded-2xl border border-dashed border-border bg-card px-4 py-6 text-center sm:p-6">
      <span className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <rect x="5" y="3" width="14" height="18" rx="2" />
          <path d="M9 8h6M9 12h6M9 16h3" />
        </svg>
      </span>
      <p className="break-words font-semibold">{title}</p>
      <p className="mx-auto mt-2 max-w-sm break-words text-sm leading-6 text-muted-foreground">{description}</p>
      <Link href={href} className="mt-4 inline-flex min-h-11 w-full items-center justify-center rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary sm:w-auto">
        {action}
      </Link>
    </div>
  );
}
