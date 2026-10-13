import { Suspense } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { connection } from "next/server";
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
      <div className="w-full max-w-2xl space-y-6">
        <h1 className="text-2xl font-semibold">OCR hanya untuk user login</h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Fitur OCR mengirim gambar ke layanan pihak ketiga dan hanya tersedia
          untuk akun yang login dengan Google. Mode demo tidak bisa memakai fitur
          ini.
        </p>
        <div className="flex flex-wrap items-center gap-4">
          <Link
            href="/login"
            className="rounded-lg bg-foreground px-5 py-3 font-medium text-background transition-opacity hover:opacity-80 focus-visible:outline-2 focus-visible:outline-offset-4"
          >
            Masuk dengan Google
          </Link>
          <Link
            href="/dashboard"
            className="text-sm underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-4"
          >
            Kembali ke dashboard
          </Link>
        </div>
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
    <div className="w-full max-w-2xl space-y-8">
      <div className="space-y-3">
        <Link
          href="/dashboard"
          className="text-sm underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-4"
        >
          Kembali ke dashboard
        </Link>
        <h1 className="text-2xl font-semibold">OCR Transaksi</h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Unggah screenshot atau foto struk. Hasilnya akan ditampilkan untuk
          dikonfirmasi sebelum disimpan.
        </p>
      </div>

      {categoryError && (
        <p role="alert" className="text-sm text-red-600 dark:text-red-400">
          Gagal memuat kategori. Silakan coba lagi.
        </p>
      )}
      <OcrForm categories={categories} />
    </div>
  );
}

export default function OcrPage() {
  return (
    <main className="flex flex-1 items-center justify-center px-6 py-12">
      <Suspense fallback={<p>Memuat OCR...</p>}>
        <Ocr />
      </Suspense>
    </main>
  );
}
