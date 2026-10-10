import { Suspense } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { connection } from "next/server";
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
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(value));
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
}: {
  label: string;
  value: number | string;
}) {
  return (
    <article className="min-w-0 space-y-2 rounded-lg border border-black/10 p-4 dark:border-white/10">
      <h3 className="text-sm font-medium text-zinc-600 dark:text-zinc-400">
        {label}
      </h3>
      <p className="break-words text-xl font-semibold tabular-nums sm:text-2xl">
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
    <div className="w-full max-w-2xl space-y-8">
      <div className="space-y-3">
        <h1 className="text-2xl font-semibold">Dashboard</h1>
        <p className="break-all">{user.email ? user.email : "Mode demo"}</p>
        <nav aria-label="Menu utama" className="flex flex-wrap gap-4">
          <Link
            href="/kategori"
            className="underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-4"
          >
            Kategori
          </Link>
          <Link
            href="/transaksi"
            className="underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-4"
          >
            Transaksi
          </Link>
        </nav>
      </div>

      <section aria-labelledby="monthly-summary-heading" className="space-y-4">
        <h2 id="monthly-summary-heading" className="text-lg font-semibold">
          Ringkasan bulanan
        </h2>
        <nav
          aria-label="Pilih bulan ringkasan"
          className="grid grid-cols-1 items-center gap-3 text-sm sm:grid-cols-3"
        >
          <Link
            href={`/dashboard?bulan=${previousMonth}`}
            className="justify-self-center underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-4 sm:justify-self-start"
          >
            Bulan sebelumnya
          </Link>
          <p className="text-center font-medium">{formatMonthId(month)}</p>
          <Link
            href={`/dashboard?bulan=${nextMonth}`}
            className="justify-self-center underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-4 sm:justify-self-end"
          >
            Bulan berikutnya
          </Link>
        </nav>

        {summaryError && (
          <p role="alert" className="text-sm text-red-600 dark:text-red-400">
            Gagal memuat ringkasan bulanan. Silakan coba lagi.
          </p>
        )}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <SummaryCard label="Pemasukan" value={summary.income} />
          <SummaryCard label="Pengeluaran" value={summary.expense} />
          <SummaryCard label="Selisih tercatat" value={summary.net} />
        </div>

        {hasNoTransactions && (
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            Belum ada transaksi di bulan ini.{" "}
            <Link href="/transaksi" className="underline underline-offset-4">
              Tambah transaksi
            </Link>
            .
          </p>
        )}
      </section>

      <form action={signOut}>
        <button
          type="submit"
          className="rounded-lg bg-foreground px-5 py-3 font-medium text-background transition-opacity hover:opacity-80 focus-visible:outline-2 focus-visible:outline-offset-4"
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
    <main className="flex flex-1 items-center justify-center px-6 py-12">
      <Suspense fallback={<p>Memuat dashboard...</p>}>
        <Dashboard searchParams={searchParams} />
      </Suspense>
    </main>
  );
}
