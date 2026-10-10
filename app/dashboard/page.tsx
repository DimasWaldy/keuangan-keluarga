import { Suspense } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { createClient } from "@/utils/supabase/server";

async function signOut() {
  "use server";

  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    redirect("/login");
  }

  const { error } = await supabase.auth.signOut();

  if (error) {
    throw new Error("Gagal keluar. Silakan coba lagi.");
  }

  redirect("/login");
}

async function Dashboard() {
  await connection();

  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    redirect("/login");
  }

  return (
    <div className="w-full max-w-sm space-y-6">
      <h1 className="text-2xl font-semibold">Dashboard</h1>
      <p className="break-all">{user.email}</p>
      <nav aria-label="Menu utama" className="flex flex-wrap gap-4">
        <Link
          href="/kategori"
          className="underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-4"
        >
          Kategori
        </Link>
        <Link
          href="/transaksi"
          className="underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-4"
        >
          Transaksi
        </Link>
      </nav>
      <form action={signOut}>
        <button
          type="submit"
          className="rounded-lg bg-foreground px-5 py-3 font-medium text-background transition-opacity hover:opacity-80 focus-visible:outline-2 focus-visible:outline-offset-4"
        >
          Keluar
        </button>
      </form>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <main className="flex flex-1 items-center justify-center px-6 py-12">
      <Suspense fallback={<p>Memuat dashboard...</p>}>
        <Dashboard />
      </Suspense>
    </main>
  );
}
