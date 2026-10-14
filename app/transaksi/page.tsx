import { Suspense } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { ThemeToggle } from "@/components/theme-toggle";
import { todayInJakarta } from "@/utils/date";
import { createClient } from "@/utils/supabase/server";
import { AddTransactionForm, DeleteTransactionForm } from "./forms";
import type { Transaction, TransactionCategory } from "./types";

const pageSize = 20;
type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>;

function formatAmount(amount: number | string) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(amount));
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
    const [categoryResult, transactionResult] = await Promise.all([
      supabase
        .from("categories")
        .select("id,name,type")
        .order("name", { ascending: true })
        .overrideTypes<TransactionCategory[], { merge: false }>(),
      supabase
        .from("transactions")
        .select("id,amount,occurred_on,note,category:categories(name,type)")
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
            className="rounded-xl px-3 py-2 text-sm font-semibold text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
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
        {transactionError ? (
          <p role="alert" className="rounded-2xl bg-danger/10 px-4 py-3 text-sm text-danger">
            Gagal memuat transaksi. Silakan coba lagi.
          </p>
        ) : items.length === 0 ? (
          <p className="rounded-[1.5rem] border border-border bg-card px-5 py-4 text-sm text-muted-foreground shadow-[var(--shadow)]">
            {page === 1
              ? "Belum ada transaksi."
              : "Tidak ada transaksi di halaman ini."}
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
                  <div className="mt-3">
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
                href={`/transaksi?page=${page - 1}`}
                className="rounded-xl px-3 py-2 font-semibold text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
              >
                Sebelumnya
              </Link>
            ) : (
              <span className="w-24" />
            )}
            <span className="px-3 py-2 font-medium text-muted-foreground">Halaman {page}</span>
            {hasNextPage ? (
              <Link
                href={`/transaksi?page=${page + 1}`}
                className="rounded-xl px-3 py-2 font-semibold text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
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
      <Suspense fallback={<p className="text-sm text-muted-foreground">Memuat transaksi...</p>}>
        <Transactions searchParams={searchParams} />
      </Suspense>
    </main>
  );
}
