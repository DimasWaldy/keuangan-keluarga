"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";

export type CategoryActionState = {
  error: string | null;
};

function errorMessage(code: string | undefined, operation: "add" | "delete") {
  if (code === "23505") {
    return "Kategori itu sudah ada";
  }

  if (operation === "delete" && code === "23503") {
    return "Kategori masih dipakai transaksi";
  }

  return operation === "add"
    ? "Gagal menambah kategori. Silakan coba lagi."
    : "Gagal menghapus kategori. Silakan coba lagi.";
}

export async function addCategory(
  _previousState: CategoryActionState,
  formData: FormData,
): Promise<CategoryActionState> {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    redirect("/login");
  }

  const rawName = formData.get("name");
  const type = formData.get("type");
  const name = typeof rawName === "string" ? rawName.trim() : "";

  if (name.length < 1 || name.length > 50) {
    return { error: "Nama kategori harus terdiri dari 1–50 karakter." };
  }

  if (type !== "income" && type !== "expense") {
    return { error: "Pilih jenis Pemasukan atau Pengeluaran." };
  }

  try {
    const { error } = await supabase.from("categories").insert({ name, type });

    if (error) {
      return { error: errorMessage(error.code, "add") };
    }
  } catch {
    return { error: errorMessage(undefined, "add") };
  }

  revalidatePath("/kategori");
  return { error: null };
}

export async function deleteCategory(
  _previousState: CategoryActionState,
  formData: FormData,
): Promise<CategoryActionState> {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    redirect("/login");
  }

  const id = formData.get("id");

  if (
    typeof id !== "string" ||
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)
  ) {
    return { error: "Kategori yang akan dihapus tidak valid." };
  }

  try {
    const { data, error } = await supabase
      .from("categories")
      .delete()
      .eq("id", id)
      .select("id")
      .maybeSingle();

    if (error || !data) {
      return { error: errorMessage(error?.code, "delete") };
    }
  } catch {
    return { error: errorMessage(undefined, "delete") };
  }

  revalidatePath("/kategori");
  return { error: null };
}
