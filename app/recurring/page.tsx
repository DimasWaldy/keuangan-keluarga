import { Suspense } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import type { TransactionCategory } from "@/app/transaksi/types";
import { createClient } from "@/utils/supabase/server";
import { CreateRecurringForm, RecurringActions, RunRecurringButton } from "./forms";

type RecurringRule = {
  id: string;
  name: string;
  amount: number | string;
  note: string | null;
  day_of_month: number;
  next_run_date: string;
  is_active: boolean;
  category: Pick<TransactionCategory, "name" | "type"> | null;
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

function formatDate(value: string) {
  return new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${value}T00:00:00Z`));
}

async function Recurring() {
  await connection();

  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    redirect("/login");
  }

  let categories: TransactionCategory[] = [];
  let rules: RecurringRule[] = [];
  let categoryError = false;
  let rulesError = false;

  try {
    const [categoryResult, rulesResult] = await Promise.all([
      supabase
        .from("categories")
        .select("id,name,type")
        .order("name", { ascending: true })
        .overrideTypes<TransactionCategory[], { merge: false }>(),
      supabase
        .from("recurring_rules")
        .select("id,name,amount,note,day_of_month,next_run_date,is_active,category:categories(name,type)")
        .order("created_at", { ascending: false })
        .overrideTypes<RecurringRule[], { merge: false }>(),
    ]);

    categoryError = Boolean(categoryResult.error);
    rulesError = Boolean(rulesResult.error);
    categories = categoryResult.error ? [] : (categoryResult.data ?? []);
    rules = rulesResult.error ? [] : (rulesResult.data ?? []);
  } catch {
    categoryError = true;
    rulesError = true;
  }

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6">
      <header className="rounded-[2rem] border border-border bg-card p-5 shadow-[var(--shadow)] sm:p-6">
        <Link href="/dashboard" className="inline-flex rounded-xl px-3 py-2 text-sm font-semibold text-muted-foreground transition-colors duration-150 hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary">
          Kembali ke dashboard
        </Link>
        <h1 className="mt-7 text-3xl font-semibold tracking-tight">Transaksi berulang</h1>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          Buat aturan transaksi bulanan seperti gaji atau langganan. Aturan dijalankan otomatis saat kamu buka dashboard, atau klik tombol di bawah untuk menjalankan yang jatuh tempo sekarang.
        </p>
        <div className="mt-4">
          <RunRecurringButton />
        </div>
      </header>

      <section aria-labelledby="create-recurring-heading" className="rounded-[2rem] border border-border bg-card p-5 shadow-[var(--shadow)] sm:p-6">
        <h2 id="create-recurring-heading" className="mb-5 text-xl font-semibold tracking-tight">Tambah aturan</h2>
        {categoryError ? (
          <p role="alert" className="rounded-xl bg-danger/10 px-3 py-2 text-sm text-danger">
            Gagal memuat kategori. Silakan coba lagi.
          </p>
        ) : (
          <CreateRecurringForm categories={categories} />
        )}
      </section>

      <section aria-labelledby="recurring-rules-heading" className="space-y-4">
        <h2 id="recurring-rules-heading" className="px-1 text-xl font-semibold tracking-tight">Aturan aktif &amp; nonaktif</h2>
        {rulesError ? (
          <p role="alert" className="rounded-xl bg-danger/10 px-4 py-3 text-sm text-danger">
            Gagal memuat aturan berulang. Silakan coba lagi.
          </p>
        ) : rules.length === 0 ? (
          <p className="rounded-xl border border-border bg-card p-6 text-sm text-muted-foreground">
            Belum ada aturan berulang.
          </p>
        ) : (
          <ul className="space-y-3">
            {rules.map((rule) => (
              <li key={rule.id} className="space-y-4 rounded-xl border border-border bg-card p-6">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 space-y-1">
                    <p className="break-words font-semibold">{rule.name}</p>
                    <p className="break-words text-sm text-muted-foreground">
                      {rule.category
                        ? `${rule.category.name} · ${rule.category.type === "income" ? "Pemasukan" : "Pengeluaran"}`
                        : "Kategori tidak tersedia"}
                    </p>
                  </div>
                  <span className={`rounded-full px-3 py-1 text-xs font-semibold ${rule.is_active ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}`}>
                    {rule.is_active ? "Aktif" : "Nonaktif"}
                  </span>
                </div>
                <p className="break-words text-xl font-semibold tabular-nums">{formatRupiah(rule.amount)}</p>
                <div className="space-y-1 text-sm text-muted-foreground">
                  <p>Setiap tanggal {rule.day_of_month}</p>
                  <p>Jadwal berikutnya: <time dateTime={rule.next_run_date}>{formatDate(rule.next_run_date)}</time></p>
                </div>
                <RecurringActions id={rule.id} isActive={rule.is_active} />
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

export default function RecurringPage() {
  return (
    <main className="flex flex-1 px-4 py-6 sm:px-6 sm:py-10">
      <Suspense fallback={<p className="animate-fade-in-up text-sm text-muted-foreground">Memuat aturan berulang...</p>}>
        <Recurring />
      </Suspense>
    </main>
  );
}
