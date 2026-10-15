"use client";

import { useActionState, useEffect, useRef } from "react";
import Link from "next/link";
import type { TransactionCategory } from "@/app/transaksi/types";
import { deleteBudget, setBudget, type BudgetActionState } from "./actions";

const initialState: BudgetActionState = { error: null, success: false };
const fieldClass =
  "min-h-11 w-full rounded-xl border border-border bg-card px-3.5 py-2.5 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus:border-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary";

export function BudgetForm({ categories }: { categories: TransactionCategory[] }) {
  const [state, formAction, pending] = useActionState(setBudget, initialState);
  const formRef = useRef<HTMLFormElement>(null);
  const expenseCategories = categories.filter((category) => category.type === "expense");

  useEffect(() => {
    if (state.success) {
      formRef.current?.reset();
    }
  }, [state]);

  if (expenseCategories.length === 0) {
    return (
      <p className="text-sm leading-6 text-muted-foreground">
        Buat kategori pengeluaran dulu di halaman{" "}
        <Link href="/kategori" className="font-semibold text-primary underline underline-offset-4">
          Kategori
        </Link>
        .
      </p>
    );
  }

  return (
    <form ref={formRef} action={formAction} className="grid gap-4 sm:grid-cols-2" aria-busy={pending}>
      <div className="space-y-2">
        <label htmlFor="budget-category" className="block text-sm font-semibold">Kategori</label>
        <select
          id="budget-category"
          name="category_id"
          defaultValue=""
          required
          className={fieldClass}
        >
          <option value="" disabled>Pilih kategori</option>
          {expenseCategories.map((category) => (
            <option key={category.id} value={category.id}>{category.name}</option>
          ))}
        </select>
      </div>
      <div className="space-y-2">
        <label htmlFor="budget-amount" className="block text-sm font-semibold">Nominal (Rp)</label>
        <input
          id="budget-amount"
          name="amount"
          type="text"
          inputMode="decimal"
          required
          placeholder="500000 atau 500.000"
          className={fieldClass}
        />
      </div>
      {state.error && (
        <p role="alert" className="animate-shake rounded-xl bg-danger/10 px-3 py-2 text-sm text-danger sm:col-span-2">
          {state.error}
        </p>
      )}
      {state.success && !pending && (
        <p role="status" className="rounded-xl bg-primary/10 px-3 py-2 text-sm text-primary sm:col-span-2">
          Budget disimpan.
        </p>
      )}
      <div className="sm:col-span-2">
        <button
          type="submit"
          disabled={pending}
          className="min-h-11 rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground shadow-sm transition-transform duration-150 ease-out hover:scale-[1.02] active:scale-[0.98] disabled:hover:scale-100 disabled:active:scale-100 hover:bg-primary-hover focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary disabled:cursor-wait disabled:opacity-60"
        >
          {pending ? "Menyimpan..." : "Simpan budget"}
        </button>
      </div>
    </form>
  );
}

export function DeleteBudgetForm({ id }: { id: string }) {
  const [state, formAction, pending] = useActionState(deleteBudget, initialState);

  return (
    <form action={formAction} className="max-w-xs space-y-2" aria-busy={pending}>
      <input type="hidden" name="id" value={id} />
      <button
        type="submit"
        disabled={pending}
        className="rounded-xl border border-border px-3 py-2 text-sm font-semibold text-danger transition-colors duration-150 hover:bg-card focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary disabled:cursor-wait disabled:opacity-60"
      >
        {pending ? "Menghapus..." : "Hapus"}
      </button>
      {state.error && (
        <p role="alert" className="rounded-xl bg-danger/10 px-3 py-2 text-xs text-danger">
          {state.error}
        </p>
      )}
    </form>
  );
}
