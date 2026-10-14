import { Suspense } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { ThemeToggle } from "@/components/theme-toggle";
import {
  currentMonthInJakarta,
  formatMonthId,
  parseMonth,
  shiftMonth,
} from "@/utils/date";
import { createClient } from "@/utils/supabase/server";

type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>;
type MonthlySummary = {
  income: number | string;
  expense: number | string;
  net: number | string;
};

const emptySummary: MonthlySummary = {
  income: "0",
  expense: "0",
  net: "0",
};

function formatRupiah(value: number | string) {
  const numeric = Number(value);
  const formatted = new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Math.abs(numeric));
  const withoutSpace = formatted.replace(/^Rp\s+/, "Rp");
  return numeric < 0 ? `-${withoutSpace}` : withoutSpace;
}

function isValidSummary(value: unknown): value is MonthlySummary {
  if (!value || typeof value !== "object") {
    return false;
  }

  const summary = value as Partial<MonthlySummary>;

  return [summary.income, summary.expense, summary.net].every(
    (amount) =>
      (typeof amount === "number" || typeof amount === "string") &&
      Number.isFinite(Number(amount)),
  );
}

function SummaryCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: number | string;
  tone: "income" | "expense" | "net";
}) {
  const toneClass = {
    income: "bg-primary",
    expense: "bg-danger",
    net: "bg-muted-foreground/50",
  }[tone];

  return (
    <article className="min-w-0 rounded-[1.5rem] border border-border bg-card p-5 shadow-[var(--shadow)]">
      <div className="flex items-center gap-2">
        <span className={`h-2 w-2 rounded-full ${toneClass}`} />
        <h3 className="text-sm font-medium text-muted-foreground">{label}</h3>
      </div>
      <p className="mt-4 break-words text-xl font-semibold tracking-tight tabular-nums sm:text-2xl">
        {formatRupiah(value)}
      </p>
    </article>
  );
}

async function signOut() {
  "use server";

  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    redirect("/login");
  }

  const { error } = await supabase.auth.signOut();

  if (error) {
    throw new Error("Gagal keluar. Silakan coba lagi.");
  }

  redirect("/login");
}

async function Dashboard({ searchParams }: { searchParams: SearchParams }) {
  await connection();

  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    redirect("/login");
  }

  const params = await searchParams;
  const requestedMonth =
    typeof params.bulan === "string" ? parseMonth(params.bulan) : null;
  const month = requestedMonth ?? currentMonthInJakarta();
  let summary = emptySummary;
  let summaryError = false;

  try {
    const { data, error: rpcError } = await supabase.rpc("monthly_summary", {
      p_month: `${month}-01`,
    });
    const row = Array.isArray(data) ? data[0] : null;

    if (rpcError || !isValidSummary(row)) {
      summaryError = true;
    } else {
      summary = row;
    }
  } catch {
    summaryError = true;
  }

  const hasNoTransactions =
    !summaryError &&
    Number(summary.income) === 0 &&
    Number(summary.expense) === 0 &&
    Number(summary.net) === 0;
  const previousMonth = shiftMonth(month, -1);
  const nextMonth = shiftMonth(month, 1);

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6">
      <header className="rounded-[2rem] border border-border bg-card p-5 shadow-[var(--shadow)] sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex min-w-0 items-center gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary text-sm font-bold tracking-tight text-primary-foreground">
              MM
            </span>
            <div className="min-w-0">
              <p className="text-sm font-semibold">My Money Money</p>
              <p className="break-all text-sm text-muted-foreground">
                {user.email ? user.email : "Mode demo"}
              </p>
            </div>
          </div>
          <ThemeToggle />
        </div>

        <nav aria-label="Menu utama" className="mt-5 flex flex-wrap gap-2">
          <Link
            href="/kategori"
            className="rounded-xl px-3.5 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          >
            Kategori
          </Link>
          <Link
            href="/transaksi"
            className="rounded-xl px-3.5 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          >
            Transaksi
          </Link>
          <Link
            href="/ocr"
            className="rounded-xl px-3.5 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          >
            OCR
          </Link>
        </nav>
      </header>

      <section aria-labelledby="monthly-summary-heading" className="space-y-5">
        <div className="flex flex-wrap items-end justify-between gap-3 px-1">
          <div>
            <p className="text-sm font-semibold text-primary">Ikhtisar keuangan</p>
            <h1 id="monthly-summary-heading" className="mt-1 text-3xl font-semibold tracking-tight">
              Dashboard
            </h1>
          </div>
        </div>

        <nav
          aria-label="Pilih bulan ringkasan"
          className="grid grid-cols-1 items-center gap-2 rounded-[1.5rem] border border-border bg-muted p-2 text-sm sm:grid-cols-3"
        >
          <Link
            href={`/dashboard?bulan=${previousMonth}`}
            className="rounded-xl px-3 py-2.5 text-center font-medium text-muted-foreground transition-colors hover:bg-card hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary sm:text-left"
          >
            Bulan sebelumnya
          </Link>
          <p className="rounded-xl bg-card px-3 py-2.5 text-center font-semibold shadow-sm">
            {formatMonthId(month)}
          </p>
          <Link
            href={`/dashboard?bulan=${nextMonth}`}
            className="rounded-xl px-3 py-2.5 text-center font-medium text-muted-foreground transition-colors hover:bg-card hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary sm:text-right"
          >
            Bulan berikutnya
          </Link>
        </nav>

        {summaryError && (
          <p role="alert" className="rounded-2xl bg-danger/10 px-4 py-3 text-sm text-danger">
            Gagal memuat ringkasan bulanan. Silakan coba lagi.
          </p>
        )}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <SummaryCard label="Pemasukan" value={summary.income} tone="income" />
          <SummaryCard label="Pengeluaran" value={summary.expense} tone="expense" />
          <SummaryCard label="Selisih tercatat" value={summary.net} tone="net" />
        </div>

        {hasNoTransactions && (
          <p className="rounded-[1.5rem] border border-border bg-card px-5 py-4 text-sm leading-6 text-muted-foreground shadow-[var(--shadow)]">
            Belum ada transaksi di bulan ini.{" "}
            <Link
              href="/transaksi"
              className="font-semibold text-primary underline underline-offset-4"
            >
              Tambah transaksi
            </Link>
            .
          </p>
        )}
      </section>

      <form action={signOut} className="pb-4">
        <button
          type="submit"
          className="rounded-xl px-4 py-2.5 text-sm font-semibold text-danger transition-colors hover:bg-danger/10 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary"
        >
          Keluar
        </button>
      </form>
    </div>
  );
}

export default function DashboardPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  return (
    <main className="flex flex-1 px-4 py-6 sm:px-6 sm:py-10">
      <Suspense fallback={<p className="text-sm text-muted-foreground">Memuat dashboard...</p>}>
        <Dashboard searchParams={searchParams} />
      </Suspense>
    </main>
  );
}
