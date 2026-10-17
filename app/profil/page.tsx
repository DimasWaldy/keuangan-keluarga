import { BackToDashboard } from "@/components/page-navigation";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { createClient } from "@/utils/supabase/server";

type ProfileStats = {
  total_transactions: number | string;
  total_income: number | string;
  total_expense: number | string;
  top_category_name: string | null;
  top_category_count: number | string | null;
};

const emptyStats: ProfileStats = {
  total_transactions: 0,
  total_income: "0",
  total_expense: "0",
  top_category_name: null,
  top_category_count: null,
};

function formatRupiah(value: number | string) {
  const numeric = Number(value);
  const formatted = new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Math.abs(numeric));
  const withoutSpace = formatted.replace(/^Rp\s+/, "Rp");
  return numeric < 0 ? `-${withoutSpace}` : withoutSpace;
}

async function Profile() {
  await connection();

  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    redirect("/login");
  }

  let stats = emptyStats;

  try {
    const { data, error } = await supabase.rpc("profile_stats");
    const row = Array.isArray(data) ? (data[0] as ProfileStats | undefined) : undefined;

    if (!error && row) {
      stats = row;
    }
  } catch {
    stats = emptyStats;
  }

  const isAnonymous = user.is_anonymous === true || !user.email;
  const avatarUrl =
    typeof user.user_metadata.avatar_url === "string"
      ? user.user_metadata.avatar_url.trim()
      : "";
  const initial = (user.email?.trim().charAt(0) || "D").toUpperCase();
  const joinedAt = new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Asia/Jakarta",
  }).format(new Date(user.created_at));
  const countFormatter = new Intl.NumberFormat("id-ID");
  const net = Number(stats.total_income) - Number(stats.total_expense);

  return (
    <div className="mx-auto w-full max-w-2xl space-y-6 text-foreground">
      <BackToDashboard />

      <header className="rounded-xl border border-border bg-card p-6">
        <h1 className="mb-5 text-2xl font-semibold tracking-tight">Profil</h1>
        <div className="flex items-center gap-4">
          {avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element -- Avatar OAuth memakai img sesuai kebutuhan halaman, tanpa konfigurasi domain baru.
            <img
              src={avatarUrl}
              alt="Foto profil"
              width={64}
              height={64}
              referrerPolicy="no-referrer"
              className="h-16 w-16 shrink-0 rounded-full object-cover"
            />
          ) : (
            <span
              aria-label="Inisial akun"
              className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-primary text-2xl font-semibold text-primary-foreground"
            >
              {initial}
            </span>
          )}
          <div className="min-w-0 space-y-1">
            <p className="break-all font-semibold">{user.email || "Akun demo"}</p>
            <p className="text-sm text-muted-foreground">
              {isAnonymous ? "Mode demo" : "Akun Google"}
            </p>
            <p className="text-sm text-muted-foreground">
              Bergabung sejak <time dateTime={user.created_at}>{joinedAt}</time>
            </p>
          </div>
        </div>
      </header>

      <section aria-label="Statistik sepanjang waktu" className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <article className="min-w-0 rounded-xl border border-border bg-card p-6">
          <h2 className="text-sm font-medium text-muted-foreground">Total transaksi</h2>
          <p className="mt-4 break-words text-2xl font-semibold tabular-nums">
            {countFormatter.format(Number(stats.total_transactions))}
          </p>
        </article>
        <article className="min-w-0 rounded-xl border border-border bg-card p-6">
          <div className="flex items-center gap-2">
            <span aria-hidden="true" className="h-2 w-2 shrink-0 rounded-full bg-primary" />
            <h2 className="text-sm font-medium text-muted-foreground">Pemasukan (sepanjang waktu)</h2>
          </div>
          <p className="mt-4 break-words text-2xl font-semibold tabular-nums">
            {formatRupiah(stats.total_income)}
          </p>
        </article>
        <article className="min-w-0 rounded-xl border border-border bg-card p-6">
          <div className="flex items-center gap-2">
            <span aria-hidden="true" className="h-2 w-2 shrink-0 rounded-full bg-danger" />
            <h2 className="text-sm font-medium text-muted-foreground">Pengeluaran (sepanjang waktu)</h2>
          </div>
          <p className="mt-4 break-words text-2xl font-semibold tabular-nums">
            {formatRupiah(stats.total_expense)}
          </p>
        </article>
        <article className="min-w-0 rounded-xl border border-border bg-card p-6">
          <h2 className="text-sm font-medium text-muted-foreground">Selisih tercatat</h2>
          <p className="mt-4 break-words text-2xl font-semibold tabular-nums">
            {formatRupiah(net)}
          </p>
        </article>
      </section>

      <section aria-labelledby="top-category-heading" className="rounded-xl border border-border bg-card p-6">
        <h2 id="top-category-heading" className="text-lg font-semibold">Kategori tersibuk</h2>
        {stats.top_category_name === null ? (
          <p className="mt-3 text-sm text-muted-foreground">Belum ada transaksi.</p>
        ) : (
          <div className="mt-3 space-y-1">
            <p className="break-words font-semibold">{stats.top_category_name}</p>
            <p className="text-sm text-muted-foreground tabular-nums">
              {countFormatter.format(Number(stats.top_category_count ?? 0))} transaksi
            </p>
          </div>
        )}
      </section>
    </div>
  );
}

export default function ProfilePage() {
  return (
    <main className="flex flex-1 px-4 py-6 sm:px-6 sm:py-10">
      <Suspense fallback={<p className="animate-fade-in-up text-sm text-muted-foreground">Memuat profil...</p>}>
        <Profile />
      </Suspense>
    </main>
  );
}
