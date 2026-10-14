import Link from "next/link";
import { ThemeToggle } from "@/components/theme-toggle";

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

const highlights = [
  "Ringkasan bulanan",
  "Mode demo tanpa login",
  "Input transaksi dari screenshot (OCR)",
];

const stack = ["Next.js", "TypeScript", "Tailwind CSS", "Supabase", "Vercel"];

export default function Home() {
  return (
    <main className="flex flex-1 px-4 py-6 sm:px-6 sm:py-10">
      <div className="mx-auto w-full max-w-5xl space-y-6">
        <header className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary text-sm font-bold tracking-tight text-primary-foreground shadow-[var(--shadow)]">
              MM
            </span>
            <p className="text-sm font-semibold tracking-tight">My Money Money</p>
          </div>
          <ThemeToggle />
        </header>

        <section className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="rounded-[2rem] border border-border bg-card p-7 shadow-[var(--shadow)] sm:p-10">
            <p className="text-sm font-semibold text-primary">Proyek portofolio</p>
            <h1 className="mt-4 max-w-xl text-4xl font-semibold tracking-[-0.04em] sm:text-5xl">
              My Money Money
            </h1>
            <p className="mt-5 max-w-lg text-base leading-7 text-muted-foreground sm:text-lg">
              Aplikasi web untuk mencatat pemasukan dan pengeluaran keluarga,
              dikelompokkan per kategori.
            </p>
            <div className="mt-8 space-y-3">
              <Link
                href="/login"
                className="inline-flex min-h-11 items-center justify-center rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground shadow-sm transition-colors hover:bg-primary-hover focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary"
              >
                Masuk dengan Google
              </Link>
              <p className="text-sm leading-6 text-muted-foreground">
                Masuk dengan Google atau coba mode demo untuk melihat data contoh.
              </p>
            </div>
          </div>

          <section
            aria-labelledby="features-heading"
            className="rounded-[2rem] border border-border bg-card p-6 shadow-[var(--shadow)] sm:p-8"
          >
            <p className="text-sm font-semibold text-primary">Yang bisa dilakukan</p>
            <h2 id="features-heading" className="mt-3 text-2xl font-semibold tracking-tight">
              Sudah tersedia
            </h2>
            <ul className="mt-6 space-y-3">
              {features.map((feature) => (
                <li key={feature.title} className="rounded-2xl bg-muted px-4 py-4">
                  <p className="font-semibold">{feature.title}</p>
                  <p className="mt-1 text-sm leading-6 text-muted-foreground">
                    {feature.text}
                  </p>
                </li>
              ))}
            </ul>
          </section>
        </section>

        <section
          aria-labelledby="highlights-heading"
          className="rounded-[2rem] border border-border bg-card p-6 shadow-[var(--shadow)] sm:p-8"
        >
          <h2 id="highlights-heading" className="text-lg font-semibold">
            Di dalam aplikasi
          </h2>
          <ul className="mt-4 grid gap-3 sm:grid-cols-3">
            {highlights.map((item) => (
              <li key={item} className="rounded-2xl bg-muted px-4 py-3 text-sm text-muted-foreground">
                {item}
              </li>
            ))}
          </ul>
        </section>

        <footer className="flex flex-col gap-4 px-1 pb-4 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <ul aria-label="Teknologi yang dipakai" className="flex flex-wrap gap-2">
            {stack.map((item) => (
              <li key={item} className="rounded-full border border-border bg-card px-3 py-1.5">
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
