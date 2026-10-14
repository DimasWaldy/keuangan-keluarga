import { Suspense } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { ThemeToggle } from "@/components/theme-toggle";
import type { TransactionCategory } from "@/app/transaksi/types";
import { createClient } from "@/utils/supabase/server";
import { OcrForm } from "./ocr-form";

async function Ocr() {
  await connection();

  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    redirect("/login");
  }

  const isAnonymous = user.is_anonymous === true || !user.email;

  if (isAnonymous) {
    return (
      <div className="mx-auto w-full max-w-3xl space-y-6">
        <header className="rounded-[2rem] border border-border bg-card p-5 shadow-[var(--shadow)] sm:p-6">
          <div className="flex items-center justify-between gap-4">
            <Link
              href="/dashboard"
              className="rounded-xl px-3 py-2 text-sm font-semibold text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
            >
              Kembali ke dashboard
            </Link>
            <ThemeToggle />
          </div>
        </header>
        <section className="rounded-[2rem] border border-border bg-card p-6 shadow-[var(--shadow)] sm:p-8">
          <p className="text-sm font-semibold text-primary">Fitur terlindungi</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">
            OCR hanya untuk user login
          </h1>
          <p className="mt-4 max-w-2xl text-sm leading-7 text-muted-foreground">
            Fitur OCR mengirim gambar ke layanan pihak ketiga dan hanya tersedia
            untuk akun yang login dengan Google. Mode demo tidak bisa memakai fitur
            ini.
          </p>
          <div className="mt-7 flex flex-wrap items-center gap-3">
            <Link
              href="/login"
              className="inline-flex min-h-11 items-center justify-center rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground shadow-sm transition-colors hover:bg-primary-hover focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary"
            >
              Masuk dengan Google
            </Link>
            <Link
              href="/dashboard"
              className="rounded-xl px-4 py-3 text-sm font-semibold text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary"
            >
              Kembali ke dashboard
            </Link>
          </div>
        </section>
      </div>
    );
  }

  let categories: TransactionCategory[] = [];
  let categoryError = false;

  try {
    const { data, error } = await supabase
      .from("categories")
      .select("id,name,type")
      .order("name", { ascending: true })
      .overrideTypes<TransactionCategory[], { merge: false }>();

    categoryError = Boolean(error);
    categories = error ? [] : (data ?? []);
  } catch {
    categoryError = true;
  }

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6">
      <header className="rounded-[2rem] border border-border bg-card p-5 shadow-[var(--shadow)] sm:p-6">
        <div className="flex items-center justify-between gap-4">
          <Link
            href="/dashboard"
            className="rounded-xl px-3 py-2 text-sm font-semibold text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          >
            Kembali ke dashboard
          </Link>
          <ThemeToggle />
        </div>
        <div className="mt-7">
          <p className="text-sm font-semibold text-primary">Input cerdas</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight">OCR Transaksi</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
            Unggah screenshot atau foto struk. Hasilnya akan ditampilkan untuk
            dikonfirmasi sebelum disimpan.
          </p>
        </div>
      </header>

      {categoryError && (
        <p role="alert" className="rounded-2xl bg-danger/10 px-4 py-3 text-sm text-danger">
          Gagal memuat kategori. Silakan coba lagi.
        </p>
      )}
      <OcrForm categories={categories} />
    </div>
  );
}

export default function OcrPage() {
  return (
    <main className="flex flex-1 px-4 py-6 sm:px-6 sm:py-10">
      <Suspense fallback={<p className="text-sm text-muted-foreground">Memuat OCR...</p>}>
        <Ocr />
      </Suspense>
    </main>
  );
}
