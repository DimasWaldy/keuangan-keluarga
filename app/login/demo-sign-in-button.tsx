"use client";

import { useActionState } from "react";
import { signInDemo, type DemoActionState } from "./actions";

const initialState: DemoActionState = { error: null };

export default function DemoSignInButton() {
  const [state, formAction, pending] = useActionState(signInDemo, initialState);

  return (
    <form action={formAction} className="space-y-3" aria-busy={pending}>
      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-lg border border-black/20 px-5 py-3 font-medium transition-colors hover:bg-black/5 focus-visible:outline-2 focus-visible:outline-offset-4 disabled:cursor-wait disabled:opacity-60 dark:border-white/20 dark:hover:bg-white/10"
      >
        {pending ? "Menyiapkan demo..." : "Coba Demo tanpa Login"}
      </button>
      <p className="text-sm text-zinc-600 dark:text-zinc-400">
        Akun sementara dengan data contoh, tanpa perlu daftar.
      </p>
      {state.error && (
        <p role="alert" className="text-sm text-red-600 dark:text-red-400">
          {state.error}
        </p>
      )}
    </form>
  );
}
