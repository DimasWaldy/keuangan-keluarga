"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import type { TransactionActionState } from "./types";
import { isUuid, validateTransaction } from "./validation";

export type UpdateTransactionState = { error: string | null };

export async function addTransaction(
  _previousState: TransactionActionState,
  formData: FormData,
): Promise<TransactionActionState> {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    redirect("/login");
  }

  const validated = validateTransaction(formData);

  if (!validated.data) {
    return { error: validated.error };
  }

  try {
    // RLS also protects this lookup when a caller submits a forged category ID.
    const { data: category, error: categoryError } = await supabase
      .from("categories")
      .select("id")
      .eq("id", validated.data.category_id)
      .maybeSingle();

    if (categoryError) {
      return { error: "Gagal memeriksa kategori. Silakan coba lagi." };
    }

    if (!category) {
      return { error: "Pilih kategori yang tersedia di akun ini." };
    }

    const { error } = await supabase.from("transactions").insert(validated.data);

    if (error) {
      return {
        error:
          error.code === "23503"
            ? "Kategori tidak tersedia. Pilih kategori lain."
            : "Gagal menambah transaksi. Silakan coba lagi.",
      };
    }
  } catch {
    return { error: "Gagal menambah transaksi. Silakan coba lagi." };
  }

  revalidatePath("/transaksi");
  return { error: null };
}

export async function deleteTransaction(
  _previousState: TransactionActionState,
  formData: FormData,
): Promise<TransactionActionState> {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    redirect("/login");
  }

  const id = formData.get("id");

  if (!isUuid(id)) {
    return { error: "Transaksi yang akan dihapus tidak valid." };
  }

  try {
    const { data, error } = await supabase
      .from("transactions")
      .delete()
      .eq("id", id)
      .select("id")
      .maybeSingle();

    if (error || !data) {
      return { error: "Gagal menghapus transaksi. Silakan coba lagi." };
    }
  } catch {
    return { error: "Gagal menghapus transaksi. Silakan coba lagi." };
  }

  revalidatePath("/transaksi");
  return { error: null };
}

export async function updateTransaction(
  _previousState: UpdateTransactionState,
  formData: FormData,
): Promise<UpdateTransactionState> {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    redirect("/login");
  }

  const id = formData.get("id");

  if (!isUuid(id)) {
    return { error: "Transaksi yang akan diubah tidak valid." };
  }

  const validated = validateTransaction(formData);

  if (!validated.data) {
    return { error: validated.error };
  }

  try {
    const { data, error } = await supabase
      .from("transactions")
      .update(validated.data)
      .eq("id", id)
      .select("id")
      .maybeSingle();

    if (error || !data) {
      return { error: "Transaksi tidak ditemukan atau tidak bisa diubah." };
    }
  } catch {
    return { error: "Transaksi tidak ditemukan atau tidak bisa diubah." };
  }

  revalidatePath("/transaksi");
  revalidatePath("/dashboard");
  return { error: null };
}
