"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { isUuid, normalizeAmount } from "@/app/transaksi/validation";
import { createClient } from "@/utils/supabase/server";

export type BudgetActionState = {
  error: string | null;
  success: boolean;
};

export async function setBudget(
  _previousState: BudgetActionState,
  formData: FormData,
): Promise<BudgetActionState> {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    redirect("/login");
  }

  const categoryId = formData.get("category_id");
  const amount = normalizeAmount(formData.get("amount"));

  if (!isUuid(categoryId) || !amount) {
    return { error: "Kategori atau nominal tidak valid.", success: false };
  }

  try {
    const { data: category, error: categoryError } = await supabase
      .from("categories")
      .select("id, type")
      .eq("id", categoryId)
      .maybeSingle();

    if (categoryError || !category) {
      return { error: "Kategori tidak ditemukan.", success: false };
    }

    if (category.type !== "expense") {
      return { error: "Budget hanya untuk kategori pengeluaran.", success: false };
    }

    const { error } = await supabase.from("budgets").upsert(
      { category_id: categoryId, amount },
      { onConflict: "user_id,category_id" },
    );

    if (error) {
      return { error: "Gagal menyimpan budget. Coba lagi.", success: false };
    }
  } catch {
    return { error: "Gagal menyimpan budget. Coba lagi.", success: false };
  }

  revalidatePath("/budget");
  revalidatePath("/dashboard");
  return { error: null, success: true };
}

export async function deleteBudget(
  _previousState: BudgetActionState,
  formData: FormData,
): Promise<BudgetActionState> {
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
    return { error: "Budget tidak ditemukan.", success: false };
  }

  try {
    const { data, error } = await supabase
      .from("budgets")
      .delete()
      .eq("id", id)
      .select("id")
      .maybeSingle();

    if (error || !data) {
      return { error: "Budget tidak ditemukan.", success: false };
    }
  } catch {
    return { error: "Budget tidak ditemukan.", success: false };
  }

  revalidatePath("/budget");
  revalidatePath("/dashboard");
  return { error: null, success: true };
}
