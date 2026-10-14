import { Suspense } from "react";
import { redirect } from "next/navigation";
import { ThemeToggle } from "@/components/theme-toggle";
import { createClient } from "@/utils/supabase/server";
import DemoSignInButton from "./demo-sign-in-button";
import GoogleSignInButton from "./google-sign-in-button";

async function Login() {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (!error && user) {
    redirect("/dashboard");
  }

  return (
    <section className="w-full max-w-md rounded-[2rem] border border-border bg-card p-6 shadow-[var(--shadow)] sm:p-8">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary text-sm font-bold tracking-tight text-primary-foreground">
            MM
          </span>
          <p className="text-sm font-semibold tracking-tight">My Money Money</p>
        </div>
        <ThemeToggle />
      </div>

      <div className="mt-10 space-y-2">
        <p className="text-sm font-semibold text-primary">Selamat datang</p>
        <h1 className="text-3xl font-semibold tracking-tight">Masuk</h1>
        <p className="text-sm leading-6 text-muted-foreground">
          Simpan catatan keluarga Anda dalam satu tempat yang rapi.
        </p>
      </div>

      <div className="mt-8 space-y-6">
        <GoogleSignInButton />
        <div className="flex items-center gap-3 text-sm text-muted-foreground">
          <span className="h-px flex-1 bg-border" />
          <p>atau</p>
          <span className="h-px flex-1 bg-border" />
        </div>
        <DemoSignInButton />
      </div>
    </section>
  );
}

export default function LoginPage() {
  return (
    <main className="flex flex-1 items-center justify-center px-4 py-6 sm:px-6 sm:py-10">
      <Suspense fallback={<p className="text-sm text-muted-foreground">Memuat halaman login...</p>}>
        <Login />
      </Suspense>
    </main>
  );
}
