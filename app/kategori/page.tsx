import { Suspense } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { AddCategoryForm, DeleteCategoryForm } from "./forms";

type Category = {
  id: string;
  name: string;
  type: string;
};

const groups = [
  { type: "income", title: "Pemasukan" },
  { type: "expense", title: "Pengeluaran" },
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
    <div className="w-full max-w-xl space-y-8">
      <div className="space-y-3">
        <Link
          href="/dashboard"
          className="text-sm underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-4"
        >
          Kembali ke dashboard
        </Link>
        <h1 className="text-2xl font-semibold">Kategori</h1>
      </div>

      <section aria-labelledby="add-category-heading" className="space-y-4">
        <h2 id="add-category-heading" className="text-lg font-semibold">
          Tambah kategori
        </h2>
        <AddCategoryForm />
      </section>

      {loadError ? (
        <p role="alert" className="text-sm text-red-600 dark:text-red-400">
          Gagal memuat kategori. Silakan coba lagi.
        </p>
      ) : (
        <div className="space-y-6">
          {groups.map((group) => {
            const items = categories.filter(
              (category) => category.type === group.type,
            );

            return (
              <section
                key={group.type}
                aria-labelledby={`category-${group.type}-heading`}
                className="space-y-3"
              >
                <h2
                  id={`category-${group.type}-heading`}
                  className="text-lg font-semibold"
                >
                  {group.title}
                </h2>
                {items.length === 0 ? (
                  <p className="text-sm text-zinc-600 dark:text-zinc-400">
                    Belum ada kategori.
                  </p>
                ) : (
                  <ul className="divide-y divide-black/10 rounded-lg border border-black/10 dark:divide-white/10 dark:border-white/10">
                    {items.map((category) => (
                      <li
                        key={category.id}
                        className="flex items-start justify-between gap-4 px-4 py-3"
                      >
                        <span className="min-w-0 break-words py-2">
                          {category.name}
                        </span>
                        <DeleteCategoryForm
                          id={category.id}
                          name={category.name}
                        />
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
    <main className="flex flex-1 items-center justify-center px-6 py-12">
      <Suspense fallback={<p>Memuat kategori...</p>}>
        <Categories />
      </Suspense>
    </main>
  );
}
