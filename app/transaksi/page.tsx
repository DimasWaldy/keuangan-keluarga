import { Suspense } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { connection } from "next/server";
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

function todayInJakarta() {
  const parts = new Intl.DateTimeFormat("en", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const value = (type: string) => parts.find((part) => part.type === type)?.value;

  return `${value("year")}-${value("month")}-${value("day")}`;
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
    <div className="w-full max-w-2xl space-y-8">
      <div className="space-y-3">
        <Link
          href="/dashboard"
          className="text-sm underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-4"
        >
          Kembali ke dashboard
        </Link>
        <h1 className="text-2xl font-semibold">Transaksi</h1>
      </div>

      <section aria-labelledby="add-transaction-heading" className="space-y-4">
        <h2 id="add-transaction-heading" className="text-lg font-semibold">
          Tambah transaksi
        </h2>
        {categoryError ? (
          <p role="alert" className="text-sm text-red-600 dark:text-red-400">
            Gagal memuat kategori. Silakan coba lagi.
          </p>
        ) : categories.length === 0 ? (
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            Buat kategori terlebih dahulu di{" "}
            <Link href="/kategori" className="underline underline-offset-4">
              halaman Kategori
            </Link>
            .
          </p>
        ) : (
          <AddTransactionForm categories={categories} today={todayInJakarta()} />
        )}
      </section>

      <section aria-labelledby="transactions-heading" className="space-y-4">
        <h2 id="transactions-heading" className="text-lg font-semibold">
          Daftar transaksi
        </h2>
        {transactionError ? (
          <p role="alert" className="text-sm text-red-600 dark:text-red-400">
            Gagal memuat transaksi. Silakan coba lagi.
          </p>
        ) : items.length === 0 ? (
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            {page === 1
              ? "Belum ada transaksi."
              : "Tidak ada transaksi di halaman ini."}
          </p>
        ) : (
          <ul className="divide-y divide-black/10 rounded-lg border border-black/10 dark:divide-white/10 dark:border-white/10">
            {items.map((transaction) => (
              <li key={transaction.id} className="space-y-3 px-4 py-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0 space-y-1">
                    <p className="break-words font-medium">
                      {transaction.category?.name ?? "Kategori tidak tersedia"}
                    </p>
                    <p className="text-sm text-zinc-600 dark:text-zinc-400">
                      {transaction.category
                        ? transaction.category.type === "income"
                          ? "Pemasukan"
                          : "Pengeluaran"
                        : "Jenis tidak tersedia"}
                      {" · "}
                      <time dateTime={transaction.occurred_on}>
                        {transaction.occurred_on.split("-").reverse().join("/")}
                      </time>
                    </p>
                  </div>
                  <p className="font-medium tabular-nums">
                    {formatAmount(transaction.amount)}
                  </p>
                </div>
                {transaction.note && (
                  <p className="break-words whitespace-pre-wrap text-sm">
                    {transaction.note}
                  </p>
                )}
                <DeleteTransactionForm id={transaction.id} />
              </li>
            ))}
          </ul>
        )}

        {(page > 1 || hasNextPage) && (
          <nav
            aria-label="Halaman transaksi"
            className="flex flex-wrap items-center justify-between gap-3 text-sm"
          >
            {page > 1 ? (
              <Link
                href={`/transaksi?page=${page - 1}`}
                className="underline underline-offset-4"
              >
                Sebelumnya
              </Link>
            ) : (
              <span />
            )}
            <span>Halaman {page}</span>
            {hasNextPage ? (
              <Link
                href={`/transaksi?page=${page + 1}`}
                className="underline underline-offset-4"
              >
                Berikutnya
              </Link>
            ) : (
              <span />
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
    <main className="flex flex-1 items-center justify-center px-6 py-12">
      <Suspense fallback={<p>Memuat transaksi...</p>}>
        <Transactions searchParams={searchParams} />
      </Suspense>
    </main>
  );
}
