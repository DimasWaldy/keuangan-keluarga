import Link from "next/link";

const features = [
  {
    title: "Login Google",
    text: "Autentikasi OAuth 2.0 lewat Supabase Auth. Aplikasi tidak menyimpan password.",
  },
  {
    title: "Kategori",
    text: "Kelompokkan pemasukan dan pengeluaran dengan kategori buatan sendiri.",
  },
  {
    title: "Transaksi",
    text: "Catat, lihat, dan hapus transaksi dengan nominal dalam format rupiah.",
  },
];

const planned = [
  "Ringkasan bulanan",
  "Mode demo tanpa login",
  "Input transaksi dari screenshot (OCR)",
];

const stack = ["Next.js", "TypeScript", "Tailwind CSS", "Supabase", "Vercel"];

export default function Home() {
  return (
    <main className="flex flex-1 items-center justify-center px-6 py-16">
      <div className="w-full max-w-2xl space-y-10">
        <header className="space-y-4">
          <p className="text-sm font-medium text-zinc-600 dark:text-zinc-400">
            Proyek portofolio
          </p>
          <h1 className="text-4xl font-semibold tracking-tight">
            Keuangan Keluarga
          </h1>
          <p className="text-lg text-zinc-700 dark:text-zinc-300">
            Aplikasi web untuk mencatat pemasukan dan pengeluaran keluarga,
            dikelompokkan per kategori.
          </p>
          <div className="space-y-2 pt-2">
            <Link
              href="/login"
              className="inline-block rounded-lg bg-foreground px-5 py-3 font-medium text-background transition-opacity hover:opacity-80 focus-visible:outline-2 focus-visible:outline-offset-4"
            >
              Masuk dengan Google
            </Link>
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              Login saat ini dibatasi untuk penguji terdaftar sampai mode demo
              tersedia.
            </p>
          </div>
        </header>

        <section aria-labelledby="features-heading" className="space-y-4">
          <h2 id="features-heading" className="text-lg font-semibold">
            Sudah tersedia
          </h2>
          <ul className="divide-y divide-black/10 rounded-lg border border-black/10 dark:divide-white/10 dark:border-white/10">
            {features.map((feature) => (
              <li key={feature.title} className="space-y-1 px-4 py-4">
                <p className="font-medium">{feature.title}</p>
                <p className="text-sm text-zinc-600 dark:text-zinc-400">
                  {feature.text}
                </p>
              </li>
            ))}
          </ul>
        </section>

        <section aria-labelledby="planned-heading" className="space-y-3">
          <h2 id="planned-heading" className="text-lg font-semibold">
            Dalam pengerjaan
          </h2>
          <ul className="list-disc space-y-1 pl-5 text-zinc-700 dark:text-zinc-300">
            {planned.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </section>

        <footer className="space-y-3 border-t border-black/10 pt-6 text-sm text-zinc-600 dark:border-white/10 dark:text-zinc-400">
          <ul aria-label="Teknologi yang dipakai" className="flex flex-wrap gap-2">
            {stack.map((item) => (
              <li
                key={item}
                className="rounded-full border border-black/15 px-3 py-1 dark:border-white/20"
              >
                {item}
              </li>
            ))}
          </ul>
          <p>Dibuat oleh Dimas.</p>
        </footer>
      </div>
    </main>
  );
}
