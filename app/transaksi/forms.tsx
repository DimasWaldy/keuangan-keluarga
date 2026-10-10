"use client";

import { useActionState } from "react";
import { addTransaction, deleteTransaction } from "./actions";
import type { TransactionActionState, TransactionCategory } from "./types";

const initialState: TransactionActionState = { error: null };
const fieldClass =
  "w-full rounded-lg border border-black/20 bg-background px-3 py-2 focus-visible:outline-2 focus-visible:outline-offset-2 dark:border-white/20";

export function AddTransactionForm({
  categories,
  today,
}: {
  categories: TransactionCategory[];
  today: string;
}) {
  const [state, formAction, pending] = useActionState(addTransaction, initialState);

  return (
    <form action={formAction} className="space-y-4" aria-busy={pending}>
      <div className="space-y-2">
        <label
          htmlFor="transaction-category"
          className="block text-sm font-medium"
        >
          Kategori
        </label>
        <select
          id="transaction-category"
          name="category_id"
          defaultValue=""
          required
          className={fieldClass}
        >
          <option value="" disabled>
            Pilih kategori
          </option>
          <optgroup label="Pemasukan">
            {categories
              .filter((category) => category.type === "income")
              .map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
          </optgroup>
          <optgroup label="Pengeluaran">
            {categories
              .filter((category) => category.type === "expense")
              .map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
          </optgroup>
        </select>
      </div>
      <div className="space-y-2">
        <label htmlFor="transaction-amount" className="block text-sm font-medium">
          Nominal (Rp)
        </label>
        <input
          id="transaction-amount"
          name="amount"
          type="text"
          inputMode="decimal"
          required
          placeholder="50.000 atau 50.000,50"
          aria-describedby="transaction-amount-help"
          className={fieldClass}
        />
        <p
          id="transaction-amount-help"
          className="text-sm text-zinc-600 dark:text-zinc-400"
        >
          Titik untuk ribuan, koma untuk desimal. Contoh: 15000, 15.000, atau 15.000,50.
        </p>
      </div>
      <div className="space-y-2">
        <label htmlFor="transaction-date" className="block text-sm font-medium">
          Tanggal
        </label>
        <input
          id="transaction-date"
          name="occurred_on"
          type="date"
          defaultValue={today}
          required
          className={fieldClass}
        />
      </div>
      <div className="space-y-2">
        <label htmlFor="transaction-note" className="block text-sm font-medium">
          Catatan (opsional)
        </label>
        <textarea
          id="transaction-note"
          name="note"
          maxLength={200}
          rows={3}
          className={fieldClass}
        />
      </div>
      {state.error && (
        <p role="alert" className="text-sm text-red-600 dark:text-red-400">
          {state.error}
        </p>
      )}
      <button
        type="submit"
        disabled={pending}
        className="rounded-lg bg-foreground px-5 py-3 font-medium text-background transition-opacity hover:opacity-80 focus-visible:outline-2 focus-visible:outline-offset-4 disabled:cursor-wait disabled:opacity-60"
      >
        {pending ? "Menambahkan..." : "Tambah transaksi"}
      </button>
    </form>
  );
}

export function DeleteTransactionForm({ id }: { id: string }) {
  const [state, formAction, pending] = useActionState(
    deleteTransaction,
    initialState,
  );

  return (
    <form action={formAction} className="space-y-2" aria-busy={pending}>
      <input type="hidden" name="id" value={id} />
      <button
        type="submit"
        disabled={pending}
        className="rounded-lg border border-black/20 px-3 py-2 text-sm font-medium transition-colors hover:bg-black/5 focus-visible:outline-2 focus-visible:outline-offset-4 disabled:cursor-wait disabled:opacity-60 dark:border-white/20 dark:hover:bg-white/10"
      >
        {pending ? "Menghapus..." : "Hapus"}
      </button>
      {state.error && (
        <p role="alert" className="text-sm text-red-600 dark:text-red-400">
          {state.error}
        </p>
      )}
    </form>
  );
}
