"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { isUuid, normalizeAmount } from "@/app/transaksi/validation";
import { shiftMonth, todayInJakarta } from "@/utils/date";
import { createClient } from "@/utils/supabase/server";

export type RecurringActionState = {
  error: string | null;
  success: boolean;
};

function nextRunDate(dayOfMonth: number) {
  const today = todayInJakarta();
  const month = today.slice(0, 7);

  function dateInMonth(value: string) {
    const [year, monthNumber] = value.split("-").map(Number);
    const lastDay = new Date(Date.UTC(year, monthNumber, 0)).getUTCDate();
    return `${value}-${String(Math.min(dayOfMonth, lastDay)).padStart(2, "0")}`;
  }

  const candidate = dateInMonth(month);
  return candidate < today ? dateInMonth(shiftMonth(month, 1)) : candidate;
}

export async function createRecurringRule(
  _previousState: RecurringActionState,
  formData: FormData,
): Promise<RecurringActionState> {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    redirect("/login");
  }

  const rawName = formData.get("name");
  const name = typeof rawName === "string" ? rawName.trim() : "";
  const categoryId = formData.get("category_id");
  const amount = normalizeAmount(formData.get("amount"));
  const rawNote = formData.get("note");
  const note = typeof rawNote === "string" ? rawNote.trim() || null : null;
  const rawDay = formData.get("day_of_month");
  const dayOfMonth =
    typeof rawDay === "string" && /^\d{1,2}$/.test(rawDay.trim())
      ? Number(rawDay.trim())
      : 0;

  if (
    name.length < 1 || name.length > 50 ||
    !isUuid(categoryId) || !amount ||
    (rawNote !== null && typeof rawNote !== "string") ||
    (note !== null && note.length > 200) ||
    dayOfMonth < 1 || dayOfMonth > 31
  ) {
    return { error: "Isian tidak valid. Periksa lagi.", success: false };
  }

  try {
    const { data: category, error: categoryError } = await supabase
      .from("categories")
      .select("id")
      .eq("id", categoryId)
      .maybeSingle();

    if (categoryError || !category) {
      return { error: "Kategori tidak ditemukan.", success: false };
    }

    const { error } = await supabase.from("recurring_rules").insert({
      name,
      category_id: categoryId,
      amount,
      note,
      day_of_month: dayOfMonth,
      next_run_date: nextRunDate(dayOfMonth),
      frequency: "monthly",
    });

    if (error) {
      return { error: "Gagal menyimpan aturan. Coba lagi.", success: false };
    }
  } catch {
    return { error: "Gagal menyimpan aturan. Coba lagi.", success: false };
  }

  revalidatePath("/recurring");
  revalidatePath("/dashboard");
  return { error: null, success: true };
}

export async function toggleRecurringRule(
  _previousState: RecurringActionState,
  formData: FormData,
): Promise<RecurringActionState> {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    redirect("/login");
  }

  const id = formData.get("id");
  const rawActive = formData.get("is_active");

  if (!isUuid(id) || (rawActive !== "true" && rawActive !== "false")) {
    return { error: "Aturan tidak ditemukan.", success: false };
  }

  try {
    const { data, error } = await supabase
      .from("recurring_rules")
      .update({ is_active: rawActive === "true" })
      .eq("id", id)
      .select("id")
      .maybeSingle();

    if (error || !data) {
      return { error: "Aturan tidak ditemukan.", success: false };
    }
  } catch {
    return { error: "Aturan tidak ditemukan.", success: false };
  }

  revalidatePath("/recurring");
  return { error: null, success: true };
}

export async function deleteRecurringRule(
  _previousState: RecurringActionState,
  formData: FormData,
): Promise<RecurringActionState> {
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
    return { error: "Aturan tidak ditemukan.", success: false };
  }

  try {
    const { data, error } = await supabase
      .from("recurring_rules")
      .delete()
      .eq("id", id)
      .select("id")
      .maybeSingle();

    if (error || !data) {
      return { error: "Aturan tidak ditemukan.", success: false };
    }
  } catch {
    return { error: "Aturan tidak ditemukan.", success: false };
  }

  revalidatePath("/recurring");
  revalidatePath("/dashboard");
  return { error: null, success: true };
}
