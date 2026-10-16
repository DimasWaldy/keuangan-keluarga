import { describe, expect, it } from "vitest";
import {
  isUuid,
  isValidDate,
  normalizeAmount,
  validateTransaction,
} from "./validation";

const validUuid = "f47ac10b-58cc-4372-a567-0e02b2c3d479";

describe("isUuid", () => {
  it.each([validUuid, validUuid.toUpperCase()])("menerima UUID %s", (value) => {
    expect(isUuid(value)).toBe(true);
  });

  it.each([
    "abc",
    "",
    null,
    undefined,
    123,
    "g47ac10b-58cc-4372-a567-0e02b2c3d479",
  ])("menolak UUID tidak valid %j", (value) => {
    expect(isUuid(value)).toBe(false);
  });
});

describe("normalizeAmount", () => {
  it.each([
    ["15000", "15000.00"],
    ["15.000", "15000.00"],
    ["1.500.000", "1500000.00"],
    ["15000,5", "15000.50"],
    ["15000,50", "15000.50"],
    ["0,5", "0.50"],
    ["999.999.999.999,99", "999999999999.99"],
    ["  15000  ", "15000.00"],
  ])("menormalkan %j menjadi %s", (input, expected) => {
    expect(normalizeAmount(input)).toBe(expected);
  });

  it.each([
    "",
    "0",
    "0,00",
    "-5",
    "1.5",
    "50.00",
    "1,500.00",
    "1,500",
    "abc",
    "1.000.000.000.000",
    "01.500",
    null,
    undefined,
    123,
    {},
  ])("menolak nominal tidak valid %j", (value) => {
    expect(normalizeAmount(value)).toBeNull();
  });
});

describe("isValidDate", () => {
  it.each(["2026-10-15", "2024-02-29"])("menerima tanggal %s", (value) => {
    expect(isValidDate(value)).toBe(true);
  });

  it.each([
    "2023-02-29",
    "2026-02-31",
    "2026-13-01",
    "2026-00-15",
    "2026-01-00",
    "2026-01-32",
    "abcd-ef-gh",
    "2026-1-5",
  ])("menolak tanggal tidak valid %s", (value) => {
    expect(isValidDate(value)).toBe(false);
  });
});

describe("validateTransaction", () => {
  function createValidFormData() {
    const formData = new FormData();
    formData.set("category_id", validUuid);
    formData.set("amount", "15000");
    formData.set("occurred_on", "2026-10-15");
    formData.set("note", "Test");
    return formData;
  }

  it("mengembalikan data transaksi valid dengan nominal string desimal", () => {
    const result = validateTransaction(createValidFormData());

    expect(result).toEqual({
      data: {
        category_id: validUuid,
        amount: "15000.00",
        occurred_on: "2026-10-15",
        note: "Test",
      },
    });
    expect(result.error).toBeUndefined();
  });

  it.each([
    ["amount", "abc", "Nominal tidak valid."],
    ["occurred_on", "2026-02-31", "Masukkan tanggal transaksi yang valid."],
    ["category_id", "bukan-uuid", "Pilih kategori yang valid."],
    ["note", "a".repeat(201), "Catatan maksimal 200 karakter."],
  ])("menolak field %s yang tidak valid", (field, value, message) => {
    const formData = createValidFormData();
    formData.set(field, value);

    const result = validateTransaction(formData);

    expect(result.error).toEqual(expect.stringContaining(message));
    expect(result.data).toBeUndefined();
  });

  it("mengubah catatan kosong menjadi null", () => {
    const formData = createValidFormData();
    formData.set("note", "");

    const result = validateTransaction(formData);

    expect(result.error).toBeUndefined();
    expect(result.data).toEqual({
      category_id: validUuid,
      amount: "15000.00",
      occurred_on: "2026-10-15",
      note: null,
    });
  });
});
