"use client";

import { useActionState } from "react";
import type { TransactionCategory } from "@/app/transaksi/types";
import { extractTransactions } from "./actions";
import { ConfirmForm } from "./confirm-form";
import type { OcrActionState } from "./types";

const initialState: OcrActionState = {
  error: null,
  transactions: null,
  raw: null,
};

export function OcrForm({ categories }: { categories: TransactionCategory[] }) {
  const [state, formAction, pending] = useActionState(
    extractTransactions,
    initialState,
  );

  return (
    <div className="space-y-6">
      <form
        action={formAction}
        className="rounded-[2rem] border border-border bg-card p-5 shadow-[var(--shadow)] sm:p-6"
        aria-busy={pending}
      >
        <div className="rounded-[1.5rem] border border-dashed border-border bg-muted p-5 sm:p-6">
          <label htmlFor="ocr-image" className="block text-sm font-semibold">
            Gambar transaksi
          </label>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">
            Pilih screenshot atau foto struk untuk diekstrak sebelum Anda menyimpannya.
          </p>
          <input
            id="ocr-image"
            type="file"
            name="image"
            accept="image/jpeg,image/png,image/webp"
            required
            className="mt-5 block w-full rounded-xl border border-border bg-card px-3 py-2 text-sm shadow-sm file:mr-3 file:rounded-lg file:border-0 file:bg-primary file:px-3 file:py-2 file:text-sm file:font-semibold file:text-primary-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          />
        </div>

        <button
          type="submit"
          disabled={pending}
          className="mt-5 min-h-11 rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground shadow-sm transition-colors hover:bg-primary-hover focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary disabled:cursor-wait disabled:opacity-60"
        >
          {pending ? "Memproses..." : "Ekstrak dengan Gemini"}
        </button>
      </form>

      {state.error && (
        <p role="alert" className="rounded-2xl bg-danger/10 px-4 py-3 text-sm text-danger">
          {state.error}
        </p>
      )}

      {!pending && state.transactions && state.transactions.length > 0 && (
        <section aria-labelledby="ocr-result-heading" className="space-y-4">
          <div className="flex items-center gap-3 px-1">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
              {state.transactions.length}
            </span>
            <p id="ocr-result-heading" className="font-semibold text-primary">
              Transaksi ditemukan. Periksa dulu sebelum disimpan.
            </p>
          </div>
          <ConfirmForm transactions={state.transactions} categories={categories} />
        </section>
      )}

      {state.transactions?.length === 0 && !state.error && (
        <p className="rounded-2xl border border-border bg-card px-4 py-3 text-sm text-muted-foreground shadow-[var(--shadow)]">
          Tidak ada transaksi yang bisa dibaca dari gambar ini.
        </p>
      )}

      {state.raw && (
        <details className="rounded-[1.5rem] border border-border bg-card p-5 shadow-[var(--shadow)]">
          <summary className="cursor-pointer font-semibold">Respons asli Gemini (untuk debugging)</summary>
          <pre className="mt-4 overflow-x-auto whitespace-pre-wrap break-words rounded-xl bg-muted p-4 text-sm text-muted-foreground">
            {state.raw}
          </pre>
        </details>
      )}
    </div>
  );
}
