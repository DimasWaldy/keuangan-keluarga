"use client";

import { useActionState, useState } from "react";
import {
  addTransaction,
  deleteTransaction,
  updateTransaction,
} from "./actions";
import type { UpdateTransactionState } from "./actions";
import type { TransactionActionState, TransactionCategory } from "./types";

const initialState: TransactionActionState = { error: null };
const editInitialState: UpdateTransactionState = { error: null };
const fieldClass =
  "min-h-11 w-full rounded-xl border border-border bg-card px-3.5 py-2.5 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus:border-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary";

export function AddTransactionForm({
  categories,
  today,
}: {
  categories: TransactionCategory[];
  today: string;
}) {
  const [state, formAction, pending] = useActionState(addTransaction, initialState);

  return (
    <form action={formAction} className="grid gap-4 sm:grid-cols-2" aria-busy={pending}>
      <div className="space-y-2">
        <label htmlFor="transaction-category" className="block text-sm font-semibold">
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
        <label htmlFor="transaction-amount" className="block text-sm font-semibold">
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
        <p id="transaction-amount-help" className="text-xs leading-5 text-muted-foreground">
          Titik untuk ribuan, koma untuk desimal. Contoh: 15000, 15.000, atau 15.000,50.
        </p>
      </div>
      <div className="space-y-2">
        <label htmlFor="transaction-date" className="block text-sm font-semibold">
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
        <label htmlFor="transaction-note" className="block text-sm font-semibold">
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
        <p role="alert" className="rounded-xl bg-danger/10 px-3 py-2 text-sm text-danger sm:col-span-2">
          {state.error}
        </p>
      )}
      <div className="sm:col-span-2">
        <button
          type="submit"
          disabled={pending}
          className="min-h-11 rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground shadow-sm transition-colors hover:bg-primary-hover focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary disabled:cursor-wait disabled:opacity-60"
        >
          {pending ? "Menambahkan..." : "Tambah transaksi"}
        </button>
      </div>
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
        className="rounded-xl px-3 py-2 text-sm font-semibold text-danger transition-colors hover:bg-danger/10 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary disabled:cursor-wait disabled:opacity-60"
      >
        {pending ? "Menghapus..." : "Hapus"}
      </button>
      {state.error && (
        <p role="alert" className="rounded-xl bg-danger/10 px-3 py-2 text-sm text-danger">
          {state.error}
        </p>
      )}
    </form>
  );
}

function formatAmountForInput(amount: string) {
  const [integer, fraction] = amount.split(".");

  if (!fraction || /^0+$/.test(fraction)) {
    return integer;
  }

  return `${integer},${fraction}`;
}

export function EditTransactionForm({
  transaction,
  categories,
}: {
  transaction: {
    id: string;
    category_id: string;
    amount: string;
    occurred_on: string;
    note: string | null;
  };
  categories: TransactionCategory[];
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [state, formAction, pending] = useActionState(
    updateTransaction,
    editInitialState,
  );
  const fieldId = `edit-transaction-${transaction.id}`;

  if (!isEditing || (hasSubmitted && !pending && state.error === null)) {
    return (
      <button
        type="button"
        onClick={() => {
          setHasSubmitted(false);
          setIsEditing(true);
        }}
        className="rounded-xl border border-border px-3 py-2 text-sm font-semibold text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary"
      >
        Edit
      </button>
    );
  }

  return (
    <form
      action={formAction}
      onSubmit={() => setHasSubmitted(true)}
      className="basis-full grid gap-4 rounded-2xl border border-border bg-muted/50 p-4 sm:grid-cols-2"
      aria-busy={pending}
    >
      <input type="hidden" name="id" value={transaction.id} />
      <div className="space-y-2">
        <label htmlFor={`${fieldId}-category`} className="block text-sm font-semibold">
          Kategori
        </label>
        <select
          id={`${fieldId}-category`}
          name="category_id"
          defaultValue={transaction.category_id}
          required
          className={fieldClass}
        >
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
        <label htmlFor={`${fieldId}-amount`} className="block text-sm font-semibold">
          Nominal (Rp)
        </label>
        <input
          id={`${fieldId}-amount`}
          name="amount"
          type="text"
          inputMode="decimal"
          defaultValue={formatAmountForInput(transaction.amount)}
          required
          placeholder="50.000 atau 50.000,50"
          aria-describedby={`${fieldId}-amount-help`}
          className={fieldClass}
        />
        <p id={`${fieldId}-amount-help`} className="text-xs leading-5 text-muted-foreground">
          Titik untuk ribuan, koma untuk desimal. Contoh: 15000, 15.000, atau 15.000,50.
        </p>
      </div>
      <div className="space-y-2">
        <label htmlFor={`${fieldId}-date`} className="block text-sm font-semibold">
          Tanggal
        </label>
        <input
          id={`${fieldId}-date`}
          name="occurred_on"
          type="date"
          defaultValue={transaction.occurred_on}
          required
          className={fieldClass}
        />
      </div>
      <div className="space-y-2">
        <label htmlFor={`${fieldId}-note`} className="block text-sm font-semibold">
          Catatan (opsional)
        </label>
        <textarea
          id={`${fieldId}-note`}
          name="note"
          defaultValue={transaction.note ?? ""}
          maxLength={200}
          rows={3}
          className={fieldClass}
        />
      </div>
      {state.error && (
        <p role="alert" className="rounded-xl bg-danger/10 px-3 py-2 text-sm text-danger sm:col-span-2">
          {state.error}
        </p>
      )}
      <div className="flex flex-wrap gap-2 sm:col-span-2">
        <button
          type="submit"
          disabled={pending}
          className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary-hover focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary disabled:cursor-wait disabled:opacity-60"
        >
          {pending ? "Menyimpan..." : "Simpan"}
        </button>
        <button
          type="button"
          onClick={() => {
            setHasSubmitted(false);
            setIsEditing(false);
          }}
          disabled={pending}
          className="rounded-xl border border-border px-4 py-2 text-sm font-semibold text-muted-foreground transition-colors hover:bg-card hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary disabled:cursor-not-allowed disabled:opacity-60"
        >
          Batal
        </button>
      </div>
    </form>
  );
}
