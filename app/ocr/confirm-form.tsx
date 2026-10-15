"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import type { TransactionCategory } from "@/app/transaksi/types";
import { saveExtractedTransactions } from "./actions";
import type { ExtractedTransaction, SaveOcrState } from "./types";

const fieldClass =
  "min-h-11 w-full rounded-xl border border-border bg-card px-3.5 py-2.5 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus:border-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:cursor-not-allowed disabled:opacity-60";
const initialSaveState: SaveOcrState = { error: null, successCount: null };

type ConfirmItem = {
  checked: boolean;
  category_id: string;
  amount: string;
  occurred_on: string;
  note: string;
};

function matchCategory(
  hint: string | null,
  categories: TransactionCategory[],
): string {
  const search = hint?.trim().toLocaleLowerCase("id-ID");

  if (!search) {
    return "";
  }

  const matches = categories
    .filter((category) =>
      category.name.toLocaleLowerCase("id-ID").includes(search),
    )
    .sort((a, b) => a.name.length - b.name.length);

  return matches[0]?.id ?? "";
}

export function ConfirmForm({
  transactions,
  categories,
}: {
  transactions: ExtractedTransaction[];
  categories: TransactionCategory[];
}) {
  const [items, setItems] = useState<ConfirmItem[]>(() =>
    transactions.map((transaction) => ({
      checked: true,
      category_id: matchCategory(transaction.category_hint, categories),
      // Gemini uses a decimal point; the form follows Indonesian notation.
      amount: transaction.amount.replace(".", ","),
      occurred_on: transaction.occurred_on,
      note: transaction.note ?? "",
    })),
  );
  const [saveState, formAction, pending] = useActionState(
    saveExtractedTransactions,
    initialSaveState,
  );
  const selectedItems = items.filter((item) => item.checked);
  const saved = saveState.successCount !== null;
  const payload = JSON.stringify(
    selectedItems.map(({ category_id, amount, occurred_on, note }) => ({
      category_id,
      amount,
      occurred_on,
      note,
    })),
  );

  function updateItem(index: number, changes: Partial<ConfirmItem>) {
    setItems((currentItems) =>
      currentItems.map((item, itemIndex) =>
        itemIndex === index ? { ...item, ...changes } : item,
      ),
    );
  }

  return (
    <form action={formAction} className="space-y-5" aria-busy={pending}>
      <input type="hidden" name="payload" value={payload} />

      {items.map((item, index) => {
        const prefix = `ocr-confirm-${index}`;
        const disabled = !item.checked || pending || saved;

        return (
          <fieldset
            key={index}
            className="min-w-0 rounded-[1.5rem] border border-border bg-card p-5 shadow-[var(--shadow)] sm:p-6"
          >
            <legend className="px-2 text-lg font-semibold tracking-tight">
              Transaksi {index + 1}
            </legend>
            <label className="mt-2 flex items-center gap-3 rounded-xl bg-muted px-3 py-2.5 text-sm font-semibold">
              <input
                type="checkbox"
                checked={item.checked}
                disabled={pending || saved}
                className="h-4 w-4 accent-primary"
                onChange={(event) =>
                  updateItem(index, { checked: event.target.checked })
                }
              />
              Simpan transaksi ini
            </label>

            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <label htmlFor={`${prefix}-amount`} className="block text-sm font-semibold">
                  Nominal (Rp)
                </label>
                <input
                  id={`${prefix}-amount`}
                  type="text"
                  inputMode="decimal"
                  value={item.amount}
                  required
                  disabled={disabled}
                  placeholder="50.000 atau 50.000,50"
                  aria-describedby={`${prefix}-amount-help`}
                  className={fieldClass}
                  onChange={(event) => updateItem(index, { amount: event.target.value })}
                />
                <p id={`${prefix}-amount-help`} className="text-xs leading-5 text-muted-foreground">
                  Titik untuk ribuan, koma untuk desimal.
                </p>
              </div>

              <div className="space-y-2">
                <label htmlFor={`${prefix}-date`} className="block text-sm font-semibold">
                  Tanggal
                </label>
                <input
                  id={`${prefix}-date`}
                  type="date"
                  value={item.occurred_on}
                  required
                  disabled={disabled}
                  className={fieldClass}
                  onChange={(event) => updateItem(index, { occurred_on: event.target.value })}
                />
              </div>

              <div className="space-y-2">
                <label htmlFor={`${prefix}-category`} className="block text-sm font-semibold">
                  Kategori
                </label>
                <select
                  id={`${prefix}-category`}
                  value={item.category_id}
                  required
                  disabled={disabled}
                  className={fieldClass}
                  onChange={(event) => updateItem(index, { category_id: event.target.value })}
                >
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
                <label htmlFor={`${prefix}-note`} className="block text-sm font-semibold">
                  Catatan (opsional)
                </label>
                <textarea
                  id={`${prefix}-note`}
                  value={item.note}
                  maxLength={200}
                  rows={3}
                  disabled={disabled}
                  className={fieldClass}
                  onChange={(event) => updateItem(index, { note: event.target.value })}
                />
              </div>
            </div>
          </fieldset>
        );
      })}

      {saveState.error && (
        <p role="alert" className="animate-shake rounded-2xl bg-danger/10 px-4 py-3 text-sm text-danger">
          {saveState.error}
        </p>
      )}

      <button
        type="submit"
        disabled={pending || selectedItems.length === 0 || saved}
        className="min-h-11 rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground shadow-sm transition-transform duration-150 ease-out not-hover:ease-in hover:scale-[1.02] active:scale-[0.98] disabled:hover:scale-100 disabled:active:scale-100 hover:bg-primary-hover focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary disabled:cursor-not-allowed disabled:opacity-60"
      >
        {pending ? "Menyimpan..." : `Simpan ${selectedItems.length} transaksi`}
      </button>

      {saved && (
        <p role="status" className="rounded-2xl bg-primary/10 px-4 py-3 text-sm text-primary">
          {saveState.successCount} transaksi berhasil disimpan.{" "}
          <Link href="/transaksi" className="font-semibold underline underline-offset-4">
            Lihat transaksi
          </Link>
        </p>
      )}
    </form>
  );
}
