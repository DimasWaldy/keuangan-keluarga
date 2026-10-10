import { Suspense } from "react";
import { redirect } from "next/navigation";
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
    <div className="w-full max-w-sm space-y-6">
      <h1 className="text-2xl font-semibold">Masuk</h1>
      <GoogleSignInButton />
      <div className="flex items-center gap-3 text-sm text-zinc-500 dark:text-zinc-400">
        <span className="h-px flex-1 bg-black/10 dark:bg-white/10" />
        <p>atau</p>
        <span className="h-px flex-1 bg-black/10 dark:bg-white/10" />
      </div>
      <DemoSignInButton />
    </div>
  );
}

export default function LoginPage() {
  return (
    <main className="flex flex-1 items-center justify-center px-6 py-12">
      <Suspense fallback={<p>Memuat halaman login...</p>}>
        <Login />
      </Suspense>
    </main>
  );
}
