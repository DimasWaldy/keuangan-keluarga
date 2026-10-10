"use client";

import { useActionState } from "react";
import {
  addCategory,
  deleteCategory,
  type CategoryActionState,
} from "./actions";

const initialState: CategoryActionState = { error: null };

export function AddCategoryForm() {
  const [state, formAction, pending] = useActionState(addCategory, initialState);

  return (
    <form action={formAction} className="space-y-4" aria-busy={pending}>
      <div className="space-y-2">
        <label htmlFor="category-name" className="block text-sm font-medium">
          Nama kategori
        </label>
        <input
          id="category-name"
          name="name"
          type="text"
          required
          maxLength={50}
          aria-describedby={state.error ? "add-category-error" : undefined}
          className="w-full rounded-lg border border-black/20 bg-background px-3 py-2 focus-visible:outline-2 focus-visible:outline-offset-2 dark:border-white/20"
        />
      </div>
      <div className="space-y-2">
        <label htmlFor="category-type" className="block text-sm font-medium">
          Jenis
        </label>
        <select
          id="category-type"
          name="type"
          defaultValue="income"
          required
          className="w-full rounded-lg border border-black/20 bg-background px-3 py-2 focus-visible:outline-2 focus-visible:outline-offset-2 dark:border-white/20"
        >
          <option value="income">Pemasukan</option>
          <option value="expense">Pengeluaran</option>
        </select>
      </div>
      {state.error && (
        <p
          id="add-category-error"
          role="alert"
          className="text-sm text-red-600 dark:text-red-400"
        >
          {state.error}
        </p>
      )}
      <button
        type="submit"
        disabled={pending}
        className="rounded-lg bg-foreground px-5 py-3 font-medium text-background transition-opacity hover:opacity-80 focus-visible:outline-2 focus-visible:outline-offset-4 disabled:cursor-wait disabled:opacity-60"
      >
        {pending ? "Menambahkan..." : "Tambah kategori"}
      </button>
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
    <form
      action={formAction}
      className="max-w-xs space-y-2 text-right"
      aria-busy={pending}
    >
      <input type="hidden" name="id" value={id} />
      <button
        type="submit"
        disabled={pending}
        aria-label={`Hapus kategori ${name}`}
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
