import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  currentMonthInJakarta,
  formatMonthId,
  parseMonth,
  shiftMonth,
  todayInJakarta,
} from "./date";

beforeEach(() => {
  // Freeze the current instant so comparisons cannot cross midnight mid-test.
  const now = new Date();
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(now);
});

afterEach(() => {
  vi.useRealTimers();
});

describe("todayInJakarta", () => {
  it("menghasilkan format YYYY-MM-DD", () => {
    expect(todayInJakarta()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it("sesuai tanggal saat ini dari Intl dengan zona Asia/Jakarta", () => {
    const expected = new Intl.DateTimeFormat("sv-SE", {
      timeZone: "Asia/Jakarta",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date());

    expect(todayInJakarta()).toBe(expected);
  });

  it.each([
    ["2026-12-31T16:59:59.000Z", "2026-12-31"],
    ["2026-12-31T17:00:00.000Z", "2027-01-01"],
  ])("mengikuti pergantian hari WIB pada %s", (instant, expected) => {
    vi.setSystemTime(new Date(instant));
    expect(todayInJakarta()).toBe(expected);
    expect(currentMonthInJakarta()).toBe(expected.slice(0, 7));
  });
});

describe("currentMonthInJakarta", () => {
  it("menghasilkan format YYYY-MM", () => {
    expect(currentMonthInJakarta()).toMatch(/^\d{4}-\d{2}$/);
  });

  it("sama dengan bagian bulan dari tanggal hari ini di Jakarta", () => {
    expect(currentMonthInJakarta()).toBe(todayInJakarta().slice(0, 7));
  });
});

describe("parseMonth", () => {
  it.each(["2026-10", "2000-01", "2100-12"])("menerima bulan %s", (month) => {
    expect(parseMonth(month)).toBe(month);
  });

  it.each([
    "2026-13",
    "2026-00",
    "2026-1",
    "1999-12",
    "2101-01",
    "",
    null,
    undefined,
    123,
  ])("menolak bulan tidak valid %j", (value) => {
    expect(parseMonth(value)).toBeNull();
  });
});

describe("shiftMonth", () => {
  it.each([
    ["2026-10", 1, "2026-11"],
    ["2026-12", 1, "2027-01"],
    ["2026-01", -1, "2025-12"],
    ["2026-10", -12, "2025-10"],
    ["2026-10", 0, "2026-10"],
    ["2026-03", -3, "2025-12"],
  ] as const)("menggeser %s sebanyak %i bulan menjadi %s", (month, delta, expected) => {
    expect(shiftMonth(month, delta)).toBe(expected);
  });
});

describe("formatMonthId", () => {
  it.each([
    ["2026-10", "Oktober"],
    ["2026-01", "Januari"],
  ])("memformat %s dengan nama bulan Indonesia", (month, name) => {
    const formatted = formatMonthId(month);
    expect(formatted).toContain(name);
    expect(formatted).toContain("2026");
  });
});
