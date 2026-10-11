import { Suspense } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { connection } from "next/server";
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

      <OcrForm />
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
