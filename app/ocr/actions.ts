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
  log_id: string | null;
};

function isOcrQuota(value: unknown): value is OcrQuota {
  if (!value || typeof value !== "object") {
    return false;
  }

  const quota = value as Partial<OcrQuota>;

  return (
    typeof quota.allowed === "boolean" &&
    Number.isInteger(quota.used) &&
    Number.isInteger(quota.daily_limit) &&
    (quota.allowed ? isUuid(quota.log_id) : quota.log_id === null)
  );
}

function errorState(error: string, raw: string | null = null): OcrActionState {
  return { error, transactions: null, raw, discardedCount: null };
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

  const isAnonymous = user.is_anonymous === true || !user.email;

  if (isAnonymous) {
    return errorState(
      "Fitur ini hanya tersedia untuk akun yang login dengan Google.",
    );
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
    const { data, error } = await supabase.rpc("ocr_reserve");
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

  async function releaseReservation() {
    try {
      await supabase.rpc("ocr_release", { p_log_id: quota.log_id });
    } catch {
      // Best effort: failure to release must not hide the original OCR error.
    }
  }

  try {
    const imageBase64 = Buffer.from(await image.arrayBuffer()).toString("base64");
    const result = await extractTransactionsFromImage(imageBase64, image.type);

    if (!result.ok) {
      await releaseReservation();
      return errorState("Gagal memproses gambar. Coba lagi.");
    }

    const raw = (JSON.stringify(result.data) ?? "").slice(0, 2000);
    const parsed = parseExtractedTransactions(result.data);

    if (!parsed || parsed.transactions.length === 0) {
      await releaseReservation();
      return errorState(
        "Tidak ada transaksi yang bisa dibaca dari gambar ini.",
        raw,
      );
    }

    return {
      error: null,
      transactions: parsed.transactions,
      raw,
      discardedCount: parsed.discarded,
    };
  } catch {
    await releaseReservation();
    return errorState("Gagal memproses gambar. Coba lagi.");
  }
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

  const isAnonymous = user.is_anonymous === true || !user.email;

  if (isAnonymous) {
    return {
      error: "Fitur ini hanya tersedia untuk akun yang login dengan Google.",
      successCount: null,
    };
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
