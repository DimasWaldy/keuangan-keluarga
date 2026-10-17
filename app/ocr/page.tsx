import { BackToDashboard } from "@/components/page-navigation";
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
            <BackToDashboard />
            <ThemeToggle />
          </div>
        </header>
        <section className="rounded-[2rem] border border-border bg-card p-6 shadow-[var(--shadow)] sm:p-8">
          <p className="text-sm font-semibold text-primary">Pindai struk</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">
            Tersedia untuk akun Google
          </h1>
          <p className="mt-4 max-w-2xl text-sm leading-7 text-muted-foreground">
            Fitur OCR mengirim gambar ke layanan pihak ketiga dan hanya tersedia
            untuk akun yang login dengan Google. Mode demo tidak bisa memakai fitur
            ini.
          </p>
          <div className="mt-7 flex flex-wrap items-center gap-3">
            <Link
              href="/transaksi#add-transaction-heading"
              className="inline-flex min-h-11 items-center justify-center rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground shadow-sm transition-colors hover:bg-primary-hover focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary"
            >
              Catat transaksi manual
            </Link>
          </div>
          <p className="mt-4 text-sm leading-6 text-muted-foreground">
            Ingin memakai pemindai? Kembali ke beranda, pilih Keluar dari demo,
            lalu masuk dengan akun Google.
          </p>
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
          <BackToDashboard />
          <ThemeToggle />
        </div>
        <div className="mt-5 sm:mt-7">
          <p className="text-sm font-semibold text-primary">Catat dari foto</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight">Pindai struk</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
            Unggah foto atau screenshot struk. Periksa dan edit hasilnya sebelum
            menyimpan sebagai transaksi.
          </p>
          <ol aria-label="Langkah pemindaian" className="mt-5 grid grid-cols-3 gap-2 text-center text-xs font-medium">
            {["Unggah foto", "Periksa hasil", "Simpan"].map((step, index) => (
              <li key={step} className="rounded-xl bg-muted px-2 py-3">
                <span className="mx-auto mb-2 flex h-6 w-6 items-center justify-center rounded-full bg-primary/15 text-primary">{index + 1}</span>
                {step}
              </li>
            ))}
          </ol>
          <p className="mt-3 text-xs leading-5 text-muted-foreground">
            Gambar diproses oleh Gemini, dengan Groq sebagai layanan cadangan.
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
      <Suspense fallback={<p className="animate-fade-in-up text-sm text-muted-foreground">Memuat OCR...</p>}>
        <Ocr />
      </Suspense>
    </main>
  );
}
