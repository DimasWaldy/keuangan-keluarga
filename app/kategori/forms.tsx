"use client";

import { useActionState } from "react";
import {
  addCategory,
  deleteCategory,
  type CategoryActionState,
} from "./actions";

const initialState: CategoryActionState = { error: null };
const fieldClass =
  "min-h-11 w-full rounded-xl border border-border bg-card px-3.5 py-2.5 text-sm shadow-sm transition-colors focus:border-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary";

export function AddCategoryForm() {
  const [state, formAction, pending] = useActionState(addCategory, initialState);

  return (
    <form action={formAction} className="grid gap-4 sm:grid-cols-2" aria-busy={pending}>
      <div className="space-y-2">
        <label htmlFor="category-name" className="block text-sm font-semibold">
          Nama kategori
        </label>
        <input
          id="category-name"
          name="name"
          type="text"
          required
          maxLength={50}
          aria-describedby={state.error ? "add-category-error" : undefined}
          className={fieldClass}
        />
      </div>
      <div className="space-y-2">
        <label htmlFor="category-type" className="block text-sm font-semibold">
          Jenis
        </label>
        <select
          id="category-type"
          name="type"
          defaultValue="income"
          required
          className={fieldClass}
        >
          <option value="income">Pemasukan</option>
          <option value="expense">Pengeluaran</option>
        </select>
      </div>
      {state.error && (
        <p
          id="add-category-error"
          role="alert"
          className="animate-shake rounded-xl bg-danger/10 px-3 py-2 text-sm text-danger sm:col-span-2"
        >
          {state.error}
        </p>
      )}
      <div className="sm:col-span-2">
        <button
          type="submit"
          disabled={pending}
          className="min-h-11 rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground shadow-sm transition-transform duration-150 ease-out not-hover:ease-in hover:scale-[1.02] active:scale-[0.98] disabled:hover:scale-100 disabled:active:scale-100 hover:bg-primary-hover focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary disabled:cursor-wait disabled:opacity-60"
        >
          {pending ? "Menambahkan..." : "Tambah kategori"}
        </button>
      </div>
    </form>
  );
}

export function DeleteCategoryForm({
  id,
  name,
}: {
  id: string;
  name: string;
}) {
  const [state, formAction, pending] = useActionState(deleteCategory, initialState);

  return (
    <form action={formAction} className="max-w-xs space-y-2 text-right" aria-busy={pending}>
      <input type="hidden" name="id" value={id} />
      <button
        type="submit"
        disabled={pending}
        aria-label={`Hapus kategori ${name}`}
        className="rounded-xl px-3 py-2 text-sm font-semibold text-danger transition-transform duration-150 ease-out not-hover:ease-in hover:scale-[1.02] active:scale-[0.98] disabled:hover:scale-100 disabled:active:scale-100 hover:bg-danger/10 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary disabled:cursor-wait disabled:opacity-60"
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
