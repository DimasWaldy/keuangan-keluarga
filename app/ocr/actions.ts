"use server";

import { Buffer } from "node:buffer";
import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { extractTransactionsFromImage } from "./gemini";
import type { OcrActionState } from "./types";
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
