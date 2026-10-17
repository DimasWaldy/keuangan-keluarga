"use client";

import { useActionState } from "react";
import { EmptyState } from "@/components/empty-state";
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
          className="mt-5 min-h-11 w-full rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground shadow-sm transition-transform duration-150 ease-out not-hover:ease-in hover:scale-[1.02] active:scale-[0.98] disabled:hover:scale-100 disabled:active:scale-100 hover:bg-primary-hover focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary disabled:cursor-wait disabled:opacity-60 sm:w-auto"
        >
          {pending ? "Memindai struk..." : "Pindai struk"}
        </button>
      </form>

      {state.error && (
        <p role="alert" className="animate-shake rounded-2xl bg-danger/10 px-4 py-3 text-sm text-danger">
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
        <EmptyState
          title="Struk belum terbaca"
          description="Coba foto yang lebih terang dan pastikan seluruh nominal terlihat."
          href="#ocr-image"
          action="Pilih gambar lain"
        />
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
