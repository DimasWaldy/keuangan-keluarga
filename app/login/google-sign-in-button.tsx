"use client";

import { useState } from "react";
import { createClient } from "@/utils/supabase/client";

export default function GoogleSignInButton() {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function signInWithGoogle() {
    setPending(true);
    setError(null);

    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: new URL("/auth/callback", window.location.origin).href,
        },
      });

      if (error) {
        throw error;
      }
    } catch {
      setError("Gagal memulai login Google. Silakan coba lagi.");
      setPending(false);
    }
  }

  return (
    <div className="space-y-3">
      <button
        type="button"
        onClick={signInWithGoogle}
        disabled={pending}
        aria-busy={pending}
        className="w-full rounded-lg bg-foreground px-5 py-3 font-medium text-background transition-opacity hover:opacity-80 focus-visible:outline-2 focus-visible:outline-offset-4 disabled:cursor-wait disabled:opacity-60"
      >
        {pending ? "Mengalihkan..." : "Masuk dengan Google"}
      </button>
      {error && (
        <p role="alert" className="text-sm text-red-600 dark:text-red-400">
          {error}
        </p>
      )}
    </div>
  );
}
