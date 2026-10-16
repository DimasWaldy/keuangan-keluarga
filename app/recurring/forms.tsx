"use client";

import { useActionState, useState } from "react";
import type { TransactionCategory } from "@/app/transaksi/types";
import {
  createRecurringRule,
  deleteRecurringRule,
  runRecurringNow,
  toggleRecurringRule,
  type RecurringActionState,
  type RunRecurringState,
} from "./actions";

const initialState: RecurringActionState = { error: null, success: false };
const runInitialState: RunRecurringState = { error: null, created: null };
const fieldClass =
  "min-h-11 w-full rounded-xl border border-border bg-card px-3.5 py-2.5 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus:border-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary";

export function CreateRecurringForm({ categories }: { categories: TransactionCategory[] }) {
  const [formKey, setFormKey] = useState(0);
  const [state, formAction, pending] = useActionState(
    async (previousState: RecurringActionState, formData: FormData) => {
      const result = await createRecurringRule(previousState, formData);
      if (result.success) {
        setFormKey((key) => key + 1);
      }
      return result;
    },
    initialState,
  );

  return (
    <form key={formKey} action={formAction} className="grid gap-4 sm:grid-cols-2" aria-busy={pending}>
      <div className="space-y-2">
        <label htmlFor="recurring-name" className="block text-sm font-semibold">Nama aturan</label>
        <input id="recurring-name" name="name" type="text" maxLength={50} required placeholder="Gaji bulanan" className={fieldClass} />
      </div>
      <div className="space-y-2">
        <label htmlFor="recurring-category" className="block text-sm font-semibold">Kategori</label>
        <select id="recurring-category" name="category_id" defaultValue="" required className={fieldClass}>
          <option value="" disabled>Pilih kategori</option>
          <optgroup label="Pemasukan">
            {categories.filter((category) => category.type === "income").map((category) => (
              <option key={category.id} value={category.id}>{category.name}</option>
            ))}
          </optgroup>
          <optgroup label="Pengeluaran">
            {categories.filter((category) => category.type === "expense").map((category) => (
              <option key={category.id} value={category.id}>{category.name}</option>
            ))}
          </optgroup>
        </select>
      </div>
      <div className="space-y-2">
        <label htmlFor="recurring-amount" className="block text-sm font-semibold">Nominal (Rp)</label>
        <input id="recurring-amount" name="amount" type="text" inputMode="decimal" required placeholder="500000 atau 500.000" className={fieldClass} />
      </div>
      <div className="space-y-2">
        <label htmlFor="recurring-day" className="block text-sm font-semibold">Tanggal setiap bulan</label>
        <input id="recurring-day" name="day_of_month" type="number" min={1} max={31} step={1} defaultValue={1} required className={fieldClass} />
      </div>
      <div className="space-y-2 sm:col-span-2">
        <label htmlFor="recurring-note" className="block text-sm font-semibold">Catatan (opsional)</label>
        <textarea id="recurring-note" name="note" maxLength={200} rows={3} className={fieldClass} />
      </div>
      {state.error && (
        <p role="alert" className="animate-shake rounded-xl bg-danger/10 px-3 py-2 text-sm text-danger sm:col-span-2">
          {state.error}
        </p>
      )}
      {state.success && !pending && (
        <p role="status" className="rounded-xl bg-primary/10 px-3 py-2 text-sm text-primary sm:col-span-2">
          Aturan ditambahkan.
        </p>
      )}
      <div className="sm:col-span-2">
        <button
          type="submit"
          disabled={pending}
          className="min-h-11 rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground shadow-sm transition-transform duration-150 ease-out hover:scale-[1.02] active:scale-[0.98] disabled:hover:scale-100 disabled:active:scale-100 hover:bg-primary-hover focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary disabled:cursor-wait disabled:opacity-60"
        >
          {pending ? "Menambahkan..." : "Tambah aturan"}
        </button>
      </div>
    </form>
  );
}

export function RecurringActions({ id, isActive }: { id: string; isActive: boolean }) {
  const [toggleState, toggleAction, togglePending] = useActionState(toggleRecurringRule, initialState);
  const [deleteState, deleteAction, deletePending] = useActionState(deleteRecurringRule, initialState);
  const pending = togglePending || deletePending;

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        <form action={toggleAction} aria-busy={togglePending}>
          <input type="hidden" name="id" value={id} />
          <input type="hidden" name="is_active" value={String(!isActive)} />
          <button
            type="submit"
            disabled={pending}
            className="rounded-xl border border-border px-3 py-2 text-sm font-semibold text-muted-foreground transition-colors hover:bg-muted hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary disabled:cursor-wait disabled:opacity-60"
          >
            {togglePending ? "Menyimpan..." : isActive ? "Nonaktifkan" : "Aktifkan"}
          </button>
        </form>
        <form action={deleteAction} aria-busy={deletePending}>
          <input type="hidden" name="id" value={id} />
          <button
            type="submit"
            disabled={pending}
            className="rounded-xl border border-border px-3 py-2 text-sm font-semibold text-danger transition-colors hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary disabled:cursor-wait disabled:opacity-60"
          >
            {deletePending ? "Menghapus..." : "Hapus"}
          </button>
        </form>
      </div>
      {toggleState.error && <p role="alert" className="text-xs text-danger">{toggleState.error}</p>}
      {deleteState.error && <p role="alert" className="text-xs text-danger">{deleteState.error}</p>}
    </div>
  );
}

export function RunRecurringButton() {
  const [state, formAction, pending] = useActionState(runRecurringNow, runInitialState);

  return (
    <form action={formAction} className="space-y-2" aria-busy={pending}>
      <button
        type="submit"
        disabled={pending}
        className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary-hover focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary disabled:cursor-wait disabled:opacity-60"
      >
        {pending ? "Menjalankan..." : "Jalankan yang jatuh tempo sekarang"}
      </button>
      {state.error && (
        <p role="alert" className="text-sm text-danger">{state.error}</p>
      )}
      {state.created !== null && !pending && (
        <p role="status" className={`text-sm ${state.created > 0 ? "text-primary" : "text-muted-foreground"}`}>
          {state.created > 0
            ? `${state.created} transaksi berhasil dibuat dari aturan berulang.`
            : "Tidak ada aturan yang jatuh tempo saat ini."}
        </p>
      )}
    </form>
  );
}
