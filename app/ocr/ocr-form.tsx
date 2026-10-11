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
      <form action={formAction} className="space-y-4" aria-busy={pending}>
        <div className="space-y-2">
          <label htmlFor="ocr-image" className="block text-sm font-medium">
            Gambar transaksi
          </label>
          <input
            id="ocr-image"
            type="file"
            name="image"
            accept="image/jpeg,image/png,image/webp"
            required
            className="block w-full rounded-lg border border-black/20 bg-background px-3 py-2 text-sm file:mr-4 file:rounded-md file:border-0 file:bg-foreground file:px-3 file:py-2 file:font-medium file:text-background focus-visible:outline-2 focus-visible:outline-offset-2 dark:border-white/20"
          />
        </div>

        <button
          type="submit"
          disabled={pending}
          className="rounded-lg bg-foreground px-5 py-3 font-medium text-background transition-opacity hover:opacity-80 focus-visible:outline-2 focus-visible:outline-offset-4 disabled:cursor-wait disabled:opacity-60"
        >
          {pending ? "Memproses..." : "Ekstrak dengan Gemini"}
        </button>
      </form>

      {state.error && (
        <p role="alert" className="text-sm text-red-600 dark:text-red-400">
          {state.error}
        </p>
      )}

      {!pending && state.transactions && state.transactions.length > 0 && (
        <section aria-labelledby="ocr-result-heading" className="space-y-3">
          <p id="ocr-result-heading" className="font-medium text-green-700 dark:text-green-400">
            Ditemukan {state.transactions.length} transaksi.
          </p>
          <ConfirmForm transactions={state.transactions} categories={categories} />
        </section>
      )}

      {state.transactions?.length === 0 && !state.error && (
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Tidak ada transaksi yang bisa dibaca dari gambar ini.
        </p>
      )}

      {state.raw && (
        <details className="space-y-3 rounded-lg border border-black/10 p-4 dark:border-white/10">
          <summary className="cursor-pointer font-medium">
            Respons asli Gemini (untuk debugging)
          </summary>
          <pre className="overflow-x-auto whitespace-pre-wrap break-words text-sm">
            {state.raw}
          </pre>
        </details>
      )}
    </div>
  );
}
