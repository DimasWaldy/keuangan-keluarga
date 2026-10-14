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
        className="flex min-h-12 w-full items-center justify-center rounded-xl border border-border bg-card px-5 py-3 text-sm font-semibold transition-colors hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary disabled:cursor-wait disabled:opacity-60"
      >
        {pending ? "Menyiapkan demo..." : "Coba Demo tanpa Login"}
      </button>
      <p className="text-sm leading-6 text-muted-foreground">
        Akun sementara dengan data contoh, tanpa perlu daftar.
      </p>
      {state.error && (
        <p role="alert" className="rounded-xl bg-danger/10 px-3 py-2 text-sm text-danger">
          {state.error}
        </p>
      )}
    </form>
  );
}
