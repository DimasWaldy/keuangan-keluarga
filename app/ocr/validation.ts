import { isValidDate } from "@/app/transaksi/validation";
import type { ExtractedTransaction } from "./types";

const amountPattern = /^\d{1,12}(\.\d{1,2})?$/;

function parseNullableText(
  value: unknown,
  maxLength: number,
): { valid: true; value: string | null } | { valid: false } {
  if (value === undefined || value === null) {
    return { valid: true, value: null };
  }

  if (typeof value !== "string") {
    return { valid: false };
  }

  return { valid: true, value: value.trim().slice(0, maxLength) };
}

export function parseExtractedTransactions(
  data: unknown,
): ExtractedTransaction[] | null {
  if (!data || typeof data !== "object" || Array.isArray(data)) {
    return null;
  }

  const transactions = (data as { transactions?: unknown }).transactions;

  if (!Array.isArray(transactions)) {
    return null;
  }

  const parsed: ExtractedTransaction[] = [];

  for (const item of transactions.slice(0, 20)) {
    if (!item || typeof item !== "object" || Array.isArray(item)) {
      continue;
    }

    const transaction = item as Record<string, unknown>;
    const amount = transaction.amount;
    const occurredOn = transaction.occurred_on;

    if (
      typeof amount !== "string" ||
      !amountPattern.test(amount) ||
      !/[1-9]/.test(amount.replace(".", "")) ||
      !isValidDate(occurredOn)
    ) {
      continue;
    }

    const note = parseNullableText(transaction.note, 200);
    const categoryHint = parseNullableText(transaction.category_hint, 50);

    if (!note.valid || !categoryHint.valid) {
      continue;
    }

    parsed.push({
      amount,
      occurred_on: occurredOn,
      note: note.value,
      category_hint: categoryHint.value,
    });
  }

  return parsed.length > 0 ? parsed : null;
}
