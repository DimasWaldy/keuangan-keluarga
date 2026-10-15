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
  todayInJakarta,
} from "@/utils/date";
import { createClient } from "@/utils/supabase/server";
import {
  AddTransactionForm,
  DeleteTransactionForm,
  EditTransactionForm,
} from "./forms";
import type { Transaction, TransactionCategory } from "./types";

const pageSize = 20;
type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>;

function formatAmount(amount: number | string) {
  const numeric = Number(amount);
  const formatted = new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Math.abs(numeric));
  const withoutSpace = formatted.replace(/^Rp\s+/, "Rp");
  return numeric < 0 ? `-${withoutSpace}` : withoutSpace;
}

async function Transactions({ searchParams }: { searchParams: SearchParams }) {
  await connection();

  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    redirect("/login");
  }

  const params = await searchParams;
  const bulan = parseMonth(params.bulan) ?? currentMonthInJakarta();
  const q = (typeof params.q === "string" ? params.q.trim().slice(0, 100) : "") || null;
  const searchQuery = q ? `&q=${encodeURIComponent(q)}` : "";
  const previousMonth = shiftMonth(bulan, -1);
  const nextMonth = shiftMonth(bulan, 1);
  const firstDayOfNextMonth = `${nextMonth}-01`;
  const page =
    typeof params.page === "string" && /^[1-9]\d{0,6}$/.test(params.page)
      ? Number(params.page)
      : 1;
  const start = (page - 1) * pageSize;
  let categories: TransactionCategory[] = [];
  let transactions: Transaction[] = [];
  let categoryError = false;
  let transactionError = false;

  try {
    let query = supabase
      .from("transactions")
      .select("id,category_id,amount,occurred_on,note,category:categories(name,type)")
      .gte("occurred_on", `${bulan}-01`)
      .lt("occurred_on", firstDayOfNextMonth);

    if (q) {
      const escaped = q.replace(/[%_\\]/g, "\\$&");
      query = query.ilike("note", `%${escaped}%`);
    }

    const [categoryResult, transactionResult] = await Promise.all([
      supabase
        .from("categories")
        .select("id,name,type")
        .order("name", { ascending: true })
        .overrideTypes<TransactionCategory[], { merge: false }>(),
      query
        .order("occurred_on", { ascending: false })
        .order("created_at", { ascending: false })
        .order("id", { ascending: false })
        // Fetch one extra row to determine whether another page exists.
        .range(start, start + pageSize)
        .overrideTypes<Transaction[], { merge: false }>(),
    ]);

    categoryError = Boolean(categoryResult.error);
    transactionError = Boolean(transactionResult.error);
    categories = categoryResult.error ? [] : (categoryResult.data ?? []);
    transactions = transactionResult.error ? [] : (transactionResult.data ?? []);
  } catch {
    categoryError = true;
    transactionError = true;
  }

  const items = transactions.slice(0, pageSize);
  const hasNextPage = transactions.length > pageSize;

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6">
      <header className="rounded-[2rem] border border-border bg-card p-5 shadow-[var(--shadow)] sm:p-6">
        <div className="flex items-center justify-between gap-4">
          <Link
            href="/dashboard"
            className="rounded-xl px-3 py-2 text-sm font-semibold text-muted-foreground transition-colors duration-150 ease-in hover:ease-out hover:bg-muted hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          >
            Kembali ke dashboard
          </Link>
          <ThemeToggle />
        </div>
        <div className="mt-7">
          <p className="text-sm font-semibold text-primary">Catatan keluarga</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight">Transaksi</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
            Catat pemasukan dan pengeluaran, lalu lihat riwayatnya dalam satu tempat.
          </p>
        </div>
      </header>

      <section
        aria-labelledby="add-transaction-heading"
        className="rounded-[2rem] border border-border bg-card p-5 shadow-[var(--shadow)] sm:p-6"
      >
        <div className="mb-5">
          <p className="text-sm font-semibold text-primary">Entri baru</p>
          <h2 id="add-transaction-heading" className="mt-1 text-xl font-semibold tracking-tight">
            Tambah transaksi
          </h2>
        </div>
        {categoryError ? (
          <p role="alert" className="rounded-xl bg-danger/10 px-3 py-2 text-sm text-danger">
            Gagal memuat kategori. Silakan coba lagi.
          </p>
        ) : categories.length === 0 ? (
          <p className="rounded-xl bg-muted px-4 py-3 text-sm leading-6 text-muted-foreground">
            Buat kategori terlebih dahulu di{" "}
            <Link href="/kategori" className="font-semibold text-primary underline underline-offset-4">
              halaman Kategori
            </Link>
            .
          </p>
        ) : (
          <AddTransactionForm categories={categories} today={todayInJakarta()} />
        )}
      </section>

      <section aria-labelledby="transactions-heading" className="space-y-5">
        <div className="px-1">
          <p className="text-sm font-semibold text-primary">Riwayat</p>
          <h2 id="transactions-heading" className="mt-1 text-xl font-semibold tracking-tight">
            Daftar transaksi
          </h2>
        </div>
        <a
          href="/transaksi/export"
          download
          className="inline-flex items-center gap-2 rounded-lg border border-border px-4 py-2 text-sm font-medium transition-colors hover:bg-card hover:border-primary"
        >
          Export CSV
        </a>
        <form
          key={q ?? ""}
          method="GET"
          action="/transaksi"
          className="flex flex-col gap-2 sm:flex-row"
        >
          <input type="hidden" name="bulan" value={bulan} />
          <input
            type="text"
            name="q"
            defaultValue={q ?? ""}
            placeholder="Cari di catatan..."
            aria-label="Cari transaksi berdasarkan catatan"
            autoComplete="off"
            maxLength={100}
            className="w-full min-w-0 flex-1 rounded-lg border border-border bg-card px-4 py-2 text-foreground placeholder:text-muted-foreground focus-visible:outline-2 focus-visible:outline-primary"
          />
          {q && (
            <Link
              href={`/transaksi?bulan=${bulan}`}
              className="shrink-0 self-center text-sm text-muted-foreground transition-colors hover:text-primary"
            >
              Hapus filter
            </Link>
          )}
          <button
            type="submit"
            className="rounded-lg bg-primary px-4 py-2 text-primary-foreground transition-colors hover:bg-primary-hover"
          >
            Cari
          </button>
        </form>
        <nav
          aria-label="Pilih bulan transaksi"
          className="grid grid-cols-1 items-center gap-2 rounded-[1.5rem] border border-border bg-muted p-2 text-sm sm:grid-cols-3"
        >
          <Link
            href={`/transaksi?bulan=${previousMonth}${searchQuery}`}
            className="rounded-xl px-3 py-2.5 text-center font-medium text-primary transition-colors duration-150 ease-in hover:ease-out hover:bg-card hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary sm:text-left"
          >
            Bulan sebelumnya
          </Link>
          <p className="rounded-xl bg-card px-3 py-2.5 text-center font-semibold text-foreground shadow-sm">
            {formatMonthId(bulan)}
          </p>
          <Link
            href={`/transaksi?bulan=${nextMonth}${searchQuery}`}
            className="rounded-xl px-3 py-2.5 text-center font-medium text-primary transition-colors duration-150 ease-in hover:ease-out hover:bg-card hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary sm:text-right"
          >
            Bulan berikutnya
          </Link>
        </nav>
        {transactionError ? (
          <p role="alert" className="rounded-2xl bg-danger/10 px-4 py-3 text-sm text-danger">
            Gagal memuat transaksi. Silakan coba lagi.
          </p>
        ) : items.length === 0 ? (
          <p className="rounded-[1.5rem] border border-border bg-card px-5 py-4 text-sm text-muted-foreground shadow-[var(--shadow)]">
            {page === 1 && q ? (
              <>
                Tidak ada transaksi yang cocok dengan pencarian &quot;{q}&quot; di bulan ini.{" "}
                <Link
                  href={`/transaksi?bulan=${bulan}`}
                  className="font-semibold text-primary underline underline-offset-4"
                >
                  Hapus pencarian
                </Link>
              </>
            ) : page === 1 ? (
              <>
                Belum ada transaksi di bulan ini.{" "}
                <Link
                  href="/transaksi"
                  className="font-semibold text-primary underline underline-offset-4"
                >
                  Lihat semua transaksi
                </Link>{" "}
                atau{" "}
                <a
                  href="#add-transaction-heading"
                  className="font-semibold text-primary underline underline-offset-4"
                >
                  tambah transaksi baru
                </a>
                .
              </>
            ) : (
              "Tidak ada transaksi di halaman ini."
            )}
          </p>
        ) : (
          <ul className="overflow-hidden rounded-[1.5rem] border border-border bg-card shadow-[var(--shadow)]">
            {items.map((transaction) => {
              const isIncome = transaction.category?.type === "income";
              const typeClass = isIncome
                ? "bg-primary/10 text-primary"
                : "bg-danger/10 text-danger";
              const amountClass = isIncome ? "text-primary" : "text-danger";

              return (
                <li key={transaction.id} className="border-b border-border px-5 py-5 last:border-b-0">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="min-w-0 space-y-2">
                      <p className="break-words font-semibold">
                        {transaction.category?.name ?? "Kategori tidak tersedia"}
                      </p>
                      <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                        <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${typeClass}`}>
                          {transaction.category
                            ? transaction.category.type === "income"
                              ? "Pemasukan"
                              : "Pengeluaran"
                            : "Jenis tidak tersedia"}
                        </span>
                        <time dateTime={transaction.occurred_on}>
                          {transaction.occurred_on.split("-").reverse().join("/")}
                        </time>
                      </div>
                    </div>
                    <p className={`break-words text-right font-semibold tracking-tight tabular-nums ${amountClass}`}>
                      {formatAmount(transaction.amount)}
                    </p>
                  </div>
                  {transaction.note && (
                    <p className="mt-3 break-words whitespace-pre-wrap text-sm leading-6 text-muted-foreground">
                      {transaction.note}
                    </p>
                  )}
                  <div className="mt-3 flex flex-wrap items-start gap-2">
                    <EditTransactionForm
                      transaction={{
                        id: transaction.id,
                        category_id: transaction.category_id,
                        amount: String(transaction.amount),
                        occurred_on: transaction.occurred_on,
                        note: transaction.note,
                      }}
                      categories={categories}
                    />
                    <DeleteTransactionForm id={transaction.id} />
                  </div>
                </li>
              );
            })}
          </ul>
        )}

        {(page > 1 || hasNextPage) && (
          <nav
            aria-label="Halaman transaksi"
            className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-card p-3 text-sm shadow-[var(--shadow)]"
          >
            {page > 1 ? (
              <Link
                href={`/transaksi?bulan=${bulan}&page=${page - 1}${searchQuery}`}
                className="rounded-xl px-3 py-2 font-semibold text-muted-foreground transition-colors duration-150 ease-in hover:ease-out hover:bg-muted hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
              >
                Sebelumnya
              </Link>
            ) : (
              <span className="w-24" />
            )}
            <span className="px-3 py-2 font-medium text-muted-foreground">Halaman {page}</span>
            {hasNextPage ? (
              <Link
                href={`/transaksi?bulan=${bulan}&page=${page + 1}${searchQuery}`}
                className="rounded-xl px-3 py-2 font-semibold text-muted-foreground transition-colors duration-150 ease-in hover:ease-out hover:bg-muted hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
              >
                Berikutnya
              </Link>
            ) : (
              <span className="w-24" />
            )}
          </nav>
        )}
      </section>
    </div>
  );
}

export default function TransactionsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  return (
    <main className="flex flex-1 px-4 py-6 sm:px-6 sm:py-10">
      <Suspense fallback={<p className="animate-fade-in-up text-sm text-muted-foreground">Memuat transaksi...</p>}>
        <Transactions searchParams={searchParams} />
      </Suspense>
    </main>
  );
}
