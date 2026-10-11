"use server";

import { Buffer } from "node:buffer";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  isUuid,
  isValidDate,
  normalizeAmount,
} from "@/app/transaksi/validation";
import { createClient } from "@/utils/supabase/server";
import { extractTransactionsFromImage } from "./gemini";
import type { OcrActionState, SaveOcrState } from "./types";
import { parseExtractedTransactions } from "./validation";

const maxImageSize = 2 * 1024 * 1024;
const allowedImageTypes = new Set(["image/jpeg", "image/png", "image/webp"]);

type OcrQuota = {
  allowed: boolean;
  used: number;
  daily_limit: number;
};

function isOcrQuota(value: unknown): value is OcrQuota {
  if (!value || typeof value !== "object") {
    return false;
  }

  const quota = value as Partial<OcrQuota>;

  return (
    typeof quota.allowed === "boolean" &&
    Number.isInteger(quota.used) &&
    Number.isInteger(quota.daily_limit)
  );
}

function errorState(error: string, raw: string | null = null): OcrActionState {
  return { error, transactions: null, raw };
}

export async function extractTransactions(
  _previousState: OcrActionState,
  formData: FormData,
): Promise<OcrActionState> {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    redirect("/login");
  }

  const image = formData.get("image");

  if (
    !(image instanceof File) ||
    image.size > maxImageSize ||
    !allowedImageTypes.has(image.type)
  ) {
    return errorState("Pilih gambar JPG, PNG, atau WebP maksimal 2 MB.");
  }

  let quota: OcrQuota;

  try {
    const { data, error } = await supabase.rpc("ocr_check");
    const firstRow = Array.isArray(data) ? data[0] : null;

    if (error || !isOcrQuota(firstRow)) {
      return errorState("Gagal memeriksa batas OCR. Coba lagi.");
    }

    quota = firstRow;
  } catch {
    return errorState("Gagal memeriksa batas OCR. Coba lagi.");
  }

  if (!quota.allowed) {
    return errorState(
      `Batas OCR harian tercapai (${quota.used}/${quota.daily_limit}). Coba lagi besok.`,
    );
  }

  let result: Awaited<ReturnType<typeof extractTransactionsFromImage>>;

  try {
    const imageBase64 = Buffer.from(await image.arrayBuffer()).toString("base64");
    result = await extractTransactionsFromImage(imageBase64, image.type);
  } catch {
    return errorState("Gagal memproses gambar. Coba lagi.");
  }

  if (!result.ok) {
    return errorState("Gagal memproses gambar. Coba lagi.");
  }

  const raw = JSON.stringify(result.data).slice(0, 2000);
  const transactions = parseExtractedTransactions(result.data);

  if (!transactions) {
    return errorState(
      "Tidak ada transaksi yang bisa dibaca dari gambar ini.",
      raw,
    );
  }

  try {
    const { error } = await supabase.rpc("ocr_log");

    if (error) {
      console.warn("[ocr] gagal mencatat log", error);
    }
  } catch (error) {
    console.warn("[ocr] gagal mencatat log", error);
  }

  return { error: null, transactions, raw };
}

export async function saveExtractedTransactions(
  _previousState: SaveOcrState,
  formData: FormData,
): Promise<SaveOcrState> {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    redirect("/login");
  }

  const payload = formData.get("payload");
  let items: unknown;

  try {
    if (typeof payload !== "string") {
      return { error: "Data transaksi tidak valid.", successCount: null };
    }

    items = JSON.parse(payload);
  } catch {
    return { error: "Data transaksi tidak valid.", successCount: null };
  }

  if (!Array.isArray(items) || items.length === 0 || items.length > 20) {
    return { error: "Data transaksi tidak valid.", successCount: null };
  }

  const invalidItem: SaveOcrState = {
    error: "Ada transaksi yang tidak valid. Periksa lagi.",
    successCount: null,
  };
  const rows: {
    category_id: string;
    amount: string;
    occurred_on: string;
    note: string | null;
  }[] = [];

  try {
    for (const item of items) {
      if (!item || typeof item !== "object" || Array.isArray(item)) {
        return invalidItem;
      }

      const transaction = item as Record<string, unknown>;
      const categoryId = transaction.category_id;
      const amount = normalizeAmount(transaction.amount);
      const occurredOn = transaction.occurred_on;
      const rawNote = transaction.note;

      if (
        !isUuid(categoryId) ||
        !amount ||
        !isValidDate(occurredOn) ||
        (rawNote !== null && typeof rawNote !== "string")
      ) {
        return invalidItem;
      }

      const note = typeof rawNote === "string" ? rawNote.trim() || null : null;

      if (note && note.length > 200) {
        return invalidItem;
      }

      const { data: category, error: categoryError } = await supabase
        .from("categories")
        .select("id")
        .eq("id", categoryId)
        .maybeSingle();

      if (categoryError || !category) {
        return invalidItem;
      }

      rows.push({ category_id: categoryId, amount, occurred_on: occurredOn, note });
    }

    const { error } = await supabase.from("transactions").insert(rows);

    if (error) {
      return { error: "Gagal menyimpan transaksi. Coba lagi.", successCount: null };
    }
  } catch {
    return { error: "Gagal menyimpan transaksi. Coba lagi.", successCount: null };
  }

  revalidatePath("/transaksi");
  revalidatePath("/dashboard");
  return { error: null, successCount: rows.length };
}
