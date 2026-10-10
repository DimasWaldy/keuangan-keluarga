export function isUuid(value: unknown): value is string {
  return (
    typeof value === "string" &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)
  );
}

// Format rupiah Indonesia: titik = pemisah ribuan (opsional), koma = desimal
// (opsional, 1-2 digit). Format ambigu seperti "1.5", "50.00", atau "1,500"
// sengaja ditolak supaya tidak ada nominal yang tersimpan salah secara diam-diam.
const plainAmount = /^(\d+)(?:,(\d{1,2}))?$/; // 15000 | 15000,5
const groupedAmount = /^([1-9]\d{0,2}(?:\.\d{3})+)(?:,(\d{1,2}))?$/; // 15.000 | 1.500.000,50

export function normalizeAmount(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const input = value.trim();
  const match = plainAmount.exec(input) ?? groupedAmount.exec(input);

  if (!match) {
    return null;
  }

  const integer = match[1].replace(/\./g, "").replace(/^0+/, "") || "0";
  const fraction = (match[2] ?? "").padEnd(2, "0");

  // numeric(14,2) permits at most 12 digits before the decimal separator.
  if (integer.length > 12 || (integer === "0" && fraction === "00")) {
    return null;
  }

  return `${integer}.${fraction}`;
}

export function isValidDate(value: unknown): value is string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }

  const [year, month, day] = value.split("-").map(Number);

  if (year < 1 || month < 1 || month > 12 || day < 1) {
    return false;
  }

  const leapYear = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
  const daysInMonth = [
    31, leapYear ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31,
  ];

  return day <= daysInMonth[month - 1];
}

type TransactionInput = {
  category_id: string;
  amount: string;
  occurred_on: string;
  note: string | null;
};

export function validateTransaction(
  formData: FormData,
): { data: TransactionInput; error?: never } | { error: string; data?: never } {
  const categoryId = formData.get("category_id");
  const amount = normalizeAmount(formData.get("amount"));
  const date = formData.get("occurred_on");
  const rawNote = formData.get("note");

  if (!isUuid(categoryId)) {
    return { error: "Pilih kategori yang valid." };
  }

  if (!amount) {
    return {
      error: "Nominal tidak valid. Contoh: 15000, 15.000, atau 15.000,50 (titik untuk ribuan, koma untuk desimal, maksimal 2 angka desimal). Nominal harus lebih dari nol dan maksimal 999.999.999.999,99.",
    };
  }

  if (!isValidDate(date)) {
    return { error: "Masukkan tanggal transaksi yang valid." };
  }

  if (rawNote !== null && typeof rawNote !== "string") {
    return { error: "Catatan harus berupa teks." };
  }

  const note = rawNote?.trim() || null;

  if (note && note.length > 200) {
    return { error: "Catatan maksimal 200 karakter." };
  }

  return {
    data: {
      category_id: categoryId,
      amount,
      occurred_on: date,
      note,
    },
  };
}
