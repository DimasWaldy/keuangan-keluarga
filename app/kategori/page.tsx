import { Suspense } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { ThemeToggle } from "@/components/theme-toggle";
import { createClient } from "@/utils/supabase/server";
import { AddCategoryForm, DeleteCategoryForm } from "./forms";

type Category = {
  id: string;
  name: string;
  type: string;
};

const groups = [
  { type: "income", title: "Pemasukan", tone: "income" },
  { type: "expense", title: "Pengeluaran", tone: "expense" },
];

async function Categories() {
  await connection();

  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    redirect("/login");
  }

  let categories: Category[] = [];
  let loadError = false;

  try {
    // RLS limits this query to the authenticated user's categories.
    const { data, error } = await supabase
      .from("categories")
      .select("id,name,type")
      .order("name", { ascending: true });

    if (error) {
      loadError = true;
    } else {
      categories = data ?? [];
    }
  } catch {
    loadError = true;
  }

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6">
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
          <p className="text-sm font-semibold text-primary">Atur pencatatan</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight">Kategori</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
            Kelompokkan transaksi agar ringkasan bulanan lebih mudah dibaca.
          </p>
        </div>
      </header>

      <section
        aria-labelledby="add-category-heading"
        className="rounded-[2rem] border border-border bg-card p-5 shadow-[var(--shadow)] sm:p-6"
      >
        <div className="mb-5">
          <p className="text-sm font-semibold text-primary">Kategori baru</p>
          <h2 id="add-category-heading" className="mt-1 text-xl font-semibold tracking-tight">
            Tambah kategori
          </h2>
        </div>
        <AddCategoryForm />
      </section>

      {loadError ? (
        <p role="alert" className="rounded-2xl bg-danger/10 px-4 py-3 text-sm text-danger">
          Gagal memuat kategori. Silakan coba lagi.
        </p>
      ) : (
        <div className="grid gap-6 lg:grid-cols-2">
          {groups.map((group) => {
            const items = categories.filter(
              (category) => category.type === group.type,
            );
            const badgeClass =
              group.tone === "income"
                ? "bg-primary/10 text-primary"
                : "bg-danger/10 text-danger";

            return (
              <section
                key={group.type}
                aria-labelledby={`category-${group.type}-heading`}
                className="rounded-[2rem] border border-border bg-card p-5 shadow-[var(--shadow)] sm:p-6"
              >
                <div className="flex items-center justify-between gap-4">
                  <h2
                    id={`category-${group.type}-heading`}
                    className="text-xl font-semibold tracking-tight"
                  >
                    {group.title}
                  </h2>
                  <span className={`rounded-full px-3 py-1 text-xs font-semibold ${badgeClass}`}>
                    {items.length}
                  </span>
                </div>
                {items.length === 0 ? (
                  <p className="mt-5 rounded-2xl bg-muted px-4 py-4 text-sm text-muted-foreground">
                    Belum ada kategori.
                  </p>
                ) : (
                  <ul className="mt-5 divide-y divide-border overflow-hidden rounded-2xl border border-border">
                    {items.map((category) => (
                      <li
                        key={category.id}
                        className="flex items-start justify-between gap-4 bg-card px-4 py-3.5"
                      >
                        <span className="min-w-0 break-words py-2 text-sm font-medium">
                          {category.name}
                        </span>
                        <DeleteCategoryForm id={category.id} name={category.name} />
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function CategoriesPage() {
  return (
    <main className="flex flex-1 px-4 py-6 sm:px-6 sm:py-10">
      <Suspense fallback={<p className="text-sm text-muted-foreground">Memuat kategori...</p>}>
        <Categories />
      </Suspense>
    </main>
  );
}
