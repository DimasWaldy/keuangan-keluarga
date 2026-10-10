function jakartaDateParts() {
  const parts = new Intl.DateTimeFormat("en", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());

  return (type: string) => parts.find((part) => part.type === type)?.value;
}

export function todayInJakarta() {
  const value = jakartaDateParts();

  return `${value("year")}-${value("month")}-${value("day")}`;
}

export function currentMonthInJakarta() {
  const value = jakartaDateParts();

  return `${value("year")}-${value("month")}`;
}

export function parseMonth(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const match = /^(\d{4})-(0[1-9]|1[0-2])$/.exec(value);

  if (!match) {
    return null;
  }

  const year = Number(match[1]);

  return year >= 2000 && year <= 2100 ? value : null;
}

export function shiftMonth(month: string, delta: number) {
  const [year, monthNumber] = month.split("-").map(Number);
  const absoluteMonth = year * 12 + (monthNumber - 1) + delta;
  const shiftedYear = Math.floor(absoluteMonth / 12);
  const shiftedMonth = absoluteMonth - shiftedYear * 12 + 1;

  return `${shiftedYear}-${String(shiftedMonth).padStart(2, "0")}`;
}

export function formatMonthId(month: string) {
  return new Intl.DateTimeFormat("id-ID", {
    timeZone: "UTC",
    month: "long",
    year: "numeric",
  }).format(new Date(`${month}-15T00:00:00Z`));
}
