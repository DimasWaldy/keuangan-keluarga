import { describe, expect, it } from "vitest";
import { parseExtractedTransactions } from "./validation";

const validTransaction = {
  amount: "15000.00",
  occurred_on: "2026-10-15",
  note: "Makan",
  category_hint: "Makanan",
};

describe("parseExtractedTransactions", () => {
  it("mengembalikan satu transaksi valid", () => {
    expect(parseExtractedTransactions({ transactions: [validTransaction] }))
      .toEqual([validTransaction]);
  });

  it.each([
    { label: "null", optional: { note: null, category_hint: null } },
    { label: "field tidak ada", optional: {} },
    { label: "undefined", optional: { note: undefined, category_hint: undefined } },
  ])("mengubah note dan category_hint $label menjadi null", ({ optional }) => {
    const transaction = {
      amount: "15000.00",
      occurred_on: "2026-10-15",
      ...optional,
    };

    expect(parseExtractedTransactions({ transactions: [transaction] })).toEqual([
      { amount: "15000.00", occurred_on: "2026-10-15", note: null, category_hint: null },
    ]);
  });

  it("hanya mengembalikan 20 transaksi pertama dari 25 transaksi", () => {
    const transactions = Array.from({ length: 25 }, (_, index) => ({
      ...validTransaction,
      note: `Transaksi ${index + 1}`,
    }));

    expect(parseExtractedTransactions({ transactions })).toEqual(transactions.slice(0, 20));
  });

  it.each([
    { label: "transactions tidak ada", input: {} },
    { label: "transactions string", input: { transactions: "abc" } },
    { label: "transactions null", input: { transactions: null } },
    { label: "null", input: null },
    { label: "undefined", input: undefined },
    { label: "string", input: "string" },
    { label: "angka", input: 123 },
    { label: "array sebagai root", input: [] },
    { label: "array transaksi kosong", input: { transactions: [] } },
  ])("mengembalikan null untuk data $label", ({ input }) => {
    expect(parseExtractedTransactions(input)).toBeNull();
  });

  it.each([
    { label: "amount abc", item: { ...validTransaction, amount: "abc" } },
    { label: "amount negatif", item: { ...validTransaction, amount: "-5" } },
    { label: "amount nol", item: { ...validTransaction, amount: "0.00" } },
    { label: "31 Februari", item: { ...validTransaction, occurred_on: "2026-02-31" } },
    { label: "tanggal abc", item: { ...validTransaction, occurred_on: "abc" } },
    { label: "null", item: null },
    { label: "undefined", item: undefined },
    { label: "string", item: "bukan object" },
    { label: "angka", item: 123 },
    { label: "array", item: [] },
    { label: "object kosong", item: {} },
  ])("membuang item $label dan mempertahankan item valid", ({ item }) => {
    expect(parseExtractedTransactions({ transactions: [item, validTransaction] }))
      .toEqual([validTransaction]);
  });

  it("mengembalikan null kalau semua item invalid", () => {
    expect(parseExtractedTransactions({
      transactions: [
        null,
        {},
        { ...validTransaction, amount: "abc" },
        { ...validTransaction, occurred_on: "2026-02-31" },
      ],
    })).toBeNull();
  });

  it("membatasi 20 item input sebelum validasi, bukan mengambil 20 item valid", () => {
    const transactions = [...Array.from({ length: 20 }, () => ({})), validTransaction];
    expect(parseExtractedTransactions({ transactions })).toBeNull();
  });

  it.each(["15000", "15000.5"])("menerima amount %s tanpa mengubah string", (amount) => {
    expect(parseExtractedTransactions({
      transactions: [{ ...validTransaction, amount }],
    })).toEqual([{ ...validTransaction, amount }]);
  });

  it("memotong note menjadi maksimal 200 karakter", () => {
    expect(parseExtractedTransactions({
      transactions: [{ ...validTransaction, note: "a".repeat(250) }],
    })).toEqual([{ ...validTransaction, note: "a".repeat(200) }]);
  });

  it("memotong category_hint menjadi maksimal 50 karakter", () => {
    expect(parseExtractedTransactions({
      transactions: [{ ...validTransaction, category_hint: "a".repeat(100) }],
    })).toEqual([{ ...validTransaction, category_hint: "a".repeat(50) }]);
  });
});
