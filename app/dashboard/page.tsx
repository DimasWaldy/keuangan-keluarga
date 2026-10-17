import { MonthNavigation } from "@/components/page-navigation";
import { Suspense } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { BudgetProgress, type BudgetStatus } from "@/components/budget-progress";
import { ExpenseChart } from "@/components/expense-chart";
import { ThemeToggle } from "@/components/theme-toggle";
import { TodayTransactions, type TodayTransaction } from "@/components/today-transactions";
import { TrendChart, type TrendDataPoint } from "@/components/trend-chart";
import {
  currentMonthInJakarta,
  formatMonthId,
  parseMonth,
  shiftMonth,
  todayInJakarta,
} from "@/utils/date";
import { createClient } from "@/utils/supabase/server";

type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>;
type MonthlySummary = {
  income: number | string;
  expense: number | string;
  net: number | string;
};

type ExpenseCategory = {
  category_id: string;
  category_name: string;
  total: number | string;
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

function isValidTrend(value: unknown, months: string[]): value is TrendDataPoint[] {
  return Array.isArray(value) && value.length === months.length && months.every(
    (monthStart) => value.some(
      (row) => row?.month_start === monthStart && [row.income, row.expense].every(
        (amount) =>
          (typeof amount === "number" ||
            (typeof amount === "string" && amount.trim() !== "")) &&
          Number.isFinite(Number(amount)) && Number(amount) >= 0,
      ),
    ),
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

  // Lazy trigger: jalankan rule berulang yang sudah jatuh tempo.
  try {
    await supabase.rpc("run_recurring_rules");
  } catch {
    // Diamkan kalau gagal; fitur ini opsional, jangan sampai dashboard crash.
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

  const today = todayInJakarta();
  const { data: todayData } = await supabase
    .from("transactions")
    .select("id, amount, note, category:categories(name, type)")
    .eq("occurred_on", today)
    .order("created_at", { ascending: false })
    .overrideTypes<TodayTransaction[], { merge: false }>();

  const trendMonths = Array.from(
    { length: 6 },
    (_, index) => `${shiftMonth(month, index - 5)}-01`,
  );
  let trendData: TrendDataPoint[] = [];
  let trendErrorMessage: string | null = null;

  try {
    const { data, error: trendError } = await supabase.rpc("monthly_trend_until", {
      p_end_month: `${month}-01`,
      p_months: 6,
    });

    if (trendError?.code === "PGRST202" || trendError?.code === "42883") {
      // Older deployments may not have migration 008 yet. Keep aggregation in SQL.
      trendData = await Promise.all(trendMonths.map(async (monthStart) => {
        if (monthStart === `${month}-01` && !summaryError) {
          return {
            month_start: monthStart,
            income: summary.income,
            expense: summary.expense,
          };
        }

        const { data: monthlyData, error: monthlyError } = await supabase.rpc(
          "monthly_summary",
          { p_month: monthStart },
        );
        const row = Array.isArray(monthlyData) ? monthlyData[0] : null;

        if (monthlyError || !isValidSummary(row)) {
          throw new Error("Monthly summary unavailable");
        }

        return {
          month_start: monthStart,
          income: row.income,
          expense: row.expense,
        };
      }));
    } else if (!trendError && isValidTrend(data, trendMonths)) {
      trendData = data;
    } else {
      throw new Error("Monthly trend unavailable");
    }
  } catch {
    trendData = [];
    trendErrorMessage = "Gagal memuat grafik tren. Silakan muat ulang halaman.";
  }

  let budgetData: BudgetStatus[] = [];

  try {
    const { data, error: budgetError } = await supabase.rpc("budget_status", {
      p_month: `${month}-01`,
    });

    if (!budgetError && Array.isArray(data)) {
      budgetData = data as BudgetStatus[];
    }
  } catch {
    budgetData = [];
  }

  let expenseData: ExpenseCategory[] = [];

  try {
    const { data, error: expenseError } = await supabase.rpc(
      "expense_by_category",
      { p_month: `${month}-01` },
    );

    if (!expenseError && Array.isArray(data)) {
      expenseData = data as ExpenseCategory[];
    }
  } catch {
    expenseData = [];
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
              <p className="text-xs text-muted-foreground">Catatan keuangan keluarga</p>
            </div>
          </div>
          <ThemeToggle />
        </div>

        <div className="mt-6 border-t border-border pt-5">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-3xl font-semibold tracking-tight">Beranda</h1>
            {(user.is_anonymous === true || !user.email) && (
              <span className="rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary">Mode demo</span>
            )}
          </div>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            Mulai dari satu catatan. Pantau pemasukan dan pengeluaranmu di sini.
          </p>
          <div className="mt-5 flex flex-col gap-2 sm:flex-row">
            <Link href="/transaksi#add-transaction-heading" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14" /></svg>
              Catat transaksi
            </Link>
            <Link href="/transaksi#transactions-heading" className="inline-flex min-h-12 items-center justify-center rounded-xl border border-border px-5 py-3 text-sm font-medium transition-colors hover:bg-muted focus-visible:outline-2 focus-visible:outline-primary">
              Lihat riwayat
            </Link>
          </div>
        </div>

        <nav aria-label="Menu utama" className="hidden md:flex mt-5 flex-wrap gap-2">
          <Link
            href="/kategori"
            className="rounded-xl px-3.5 py-2 text-sm font-medium text-muted-foreground transition-colors duration-150 ease-in hover:ease-out hover:bg-muted hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          >
            Kategori
          </Link>
          <Link
            href="/transaksi"
            className="rounded-xl px-3.5 py-2 text-sm font-medium text-muted-foreground transition-colors duration-150 ease-in hover:ease-out hover:bg-muted hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          >
            Transaksi
          </Link>
          <Link
            href="/ocr"
            className="rounded-xl px-3.5 py-2 text-sm font-medium text-muted-foreground transition-colors duration-150 ease-in hover:ease-out hover:bg-muted hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          >
            Pindai struk
          </Link>
          <Link
            href="/profil"
            className="rounded-xl px-3.5 py-2 text-sm font-medium text-muted-foreground transition-colors duration-150 ease-in hover:ease-out hover:bg-muted hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          >
            Profil
          </Link>
          <Link
            href="/budget"
            className="rounded-xl px-3.5 py-2 text-sm font-medium text-muted-foreground transition-colors duration-150 ease-in hover:ease-out hover:bg-muted hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          >
            Budget
          </Link>
          <Link
            href="/recurring"
            className="rounded-xl px-3.5 py-2 text-sm font-medium text-muted-foreground transition-colors duration-150 ease-in hover:ease-out hover:bg-muted hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          >
            Berulang
          </Link>
        </nav>
      </header>

      <section aria-labelledby="manage-heading" className="md:hidden">
        <details className="group overflow-hidden rounded-2xl border border-border bg-card">
          <summary className="flex min-h-16 cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 focus-visible:outline-2 focus-visible:outline-primary focus-visible:-outline-offset-2 [&::-webkit-details-marker]:hidden">
            <span><span id="manage-heading" className="block text-sm font-semibold">Kelola keuangan</span><span className="mt-0.5 block text-xs text-muted-foreground">Kategori, budget &amp; transaksi berulang</span></span>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="shrink-0 text-muted-foreground transition-transform duration-150 group-open:rotate-180"><path d="m5 9 7 7 7-7" /></svg>
          </summary>
        <div className="divide-y divide-border border-t border-border">
          {[
            { href: "/kategori", label: "Kategori", description: "Kelompokkan catatanmu" },
            { href: "/budget", label: "Budget bulanan", description: "Atur batas pengeluaran" },
            { href: "/recurring", label: "Transaksi berulang", description: "Jadwalkan gaji dan tagihan" },
          ].map((item) => (
            <Link key={item.href} href={item.href} className="flex min-h-16 items-center justify-between gap-3 px-4 py-3 transition-colors hover:bg-muted focus-visible:outline-2 focus-visible:outline-primary focus-visible:-outline-offset-2">
              <span><span className="block text-sm font-semibold">{item.label}</span><span className="mt-0.5 block text-xs text-muted-foreground">{item.description}</span></span>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="shrink-0 text-muted-foreground"><path d="m9 5 7 7-7 7" /></svg>
            </Link>
          ))}
        </div>
        </details>
      </section>

      <TodayTransactions data={todayData ?? []} />

      <section aria-labelledby="monthly-summary-heading" className="space-y-5">
        <div className="flex flex-wrap items-end justify-between gap-3 px-1">
          <div>
            <h2 id="monthly-summary-heading" className="text-xl font-semibold tracking-tight">
              Ringkasan bulanan
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">Pilih bulan untuk melihat catatan dan grafiknya.</p>
          </div>
        </div>

        <MonthNavigation
          label="Pilih bulan ringkasan"
          month={formatMonthId(month)}
          previousHref={`/dashboard?bulan=${previousMonth}`}
          nextHref={`/dashboard?bulan=${nextMonth}`}
        />

        <a
          href={`/laporan?bulan=${month}`}
          className="inline-flex items-center gap-2 rounded-lg border border-border px-4 py-2 text-sm font-medium transition-colors hover:bg-card hover:border-primary"
        >
          Download laporan PDF
        </a>

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

        <ExpenseChart data={expenseData} />
        <TrendChart
          data={trendData}
          title={`Tren 6 bulan hingga ${formatMonthId(month)}`}
          months={trendMonths}
          error={trendErrorMessage}
        />
        <BudgetProgress data={budgetData} />

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
          {user.is_anonymous === true || !user.email ? "Keluar dari demo" : "Keluar dari akun"}
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
      <Suspense fallback={<p className="animate-fade-in-up text-sm text-muted-foreground">Memuat dashboard...</p>}>
        <Dashboard searchParams={searchParams} />
      </Suspense>
    </main>
  );
}
