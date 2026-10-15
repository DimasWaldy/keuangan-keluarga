import { Suspense } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import type { TransactionCategory } from "@/app/transaksi/types";
import { createClient } from "@/utils/supabase/server";
import { BudgetForm, DeleteBudgetForm } from "./forms";

type Budget = {
  id: string;
  amount: number | string;
  category: { id: string; name: string } | null;
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

async function Budgets() {
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
  let budgets: Budget[] = [];
  let categoryError = false;
  let budgetError = false;

  try {
    const [categoryResult, budgetResult] = await Promise.all([
      supabase
        .from("categories")
        .select("id,name,type")
        .order("name", { ascending: true })
        .overrideTypes<TransactionCategory[], { merge: false }>(),
      supabase
        .from("budgets")
        .select("id,amount,category:categories(id,name)")
        .order("created_at", { ascending: false })
        .overrideTypes<Budget[], { merge: false }>(),
    ]);

    categoryError = Boolean(categoryResult.error);
    budgetError = Boolean(budgetResult.error);
    categories = categoryResult.error ? [] : (categoryResult.data ?? []);
    budgets = budgetResult.error ? [] : (budgetResult.data ?? []);
  } catch {
    categoryError = true;
    budgetError = true;
  }

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6">
      <header className="rounded-[2rem] border border-border bg-card p-5 shadow-[var(--shadow)] sm:p-6">
        <Link
          href="/dashboard"
          className="inline-flex rounded-xl px-3 py-2 text-sm font-semibold text-muted-foreground transition-colors duration-150 hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        >
          Kembali ke dashboard
        </Link>
        <h1 className="mt-7 text-3xl font-semibold tracking-tight">Budget bulanan</h1>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          Set batas pengeluaran per kategori. Progress muncul di dashboard.
        </p>
      </header>

      <section aria-labelledby="set-budget-heading" className="rounded-[2rem] border border-border bg-card p-5 shadow-[var(--shadow)] sm:p-6">
        <h2 id="set-budget-heading" className="mb-5 text-xl font-semibold tracking-tight">
          Tambah atau ubah budget
        </h2>
        {categoryError ? (
          <p role="alert" className="rounded-xl bg-danger/10 px-3 py-2 text-sm text-danger">
            Gagal memuat kategori. Silakan coba lagi.
          </p>
        ) : (
          <BudgetForm categories={categories} />
        )}
      </section>

      <section aria-labelledby="active-budgets-heading" className="space-y-4">
        <h2 id="active-budgets-heading" className="px-1 text-xl font-semibold tracking-tight">
          Budget aktif
        </h2>
        {budgetError ? (
          <p role="alert" className="rounded-xl bg-danger/10 px-4 py-3 text-sm text-danger">
            Gagal memuat budget. Silakan coba lagi.
          </p>
        ) : budgets.length === 0 ? (
          <p className="rounded-xl border border-border bg-card p-6 text-sm text-muted-foreground">
            Belum ada budget. Tambah di atas.
          </p>
        ) : (
          <ul className="space-y-3">
            {budgets.map((budget) => (
              <li key={budget.id} className="flex flex-wrap items-start justify-between gap-4 rounded-xl border border-border bg-card p-6">
                <div className="min-w-0 space-y-2">
                  <p className="break-words font-semibold">
                    {budget.category?.name ?? "Kategori tidak tersedia"}
                  </p>
                  <p className="break-words text-xl font-semibold text-primary tabular-nums">
                    {formatRupiah(budget.amount)}
                  </p>
                </div>
                <DeleteBudgetForm id={budget.id} />
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

export default function BudgetPage() {
  return (
    <main className="flex flex-1 px-4 py-6 sm:px-6 sm:py-10">
      <Suspense fallback={<p className="animate-fade-in-up text-sm text-muted-foreground">Memuat budget...</p>}>
        <Budgets />
      </Suspense>
    </main>
  );
}
