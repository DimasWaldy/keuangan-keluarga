import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { parseMonth, shiftMonth, todayInJakarta } from "@/utils/date";

type ExportTransaction = {
  occurred_on: string;
  amount: string | number;
  note: string | null;
  category: { name: string; type: string } | null;
};

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return new NextResponse("Harus login terlebih dahulu.", { status: 401 });
  }

  const rawMonth = request.nextUrl.searchParams.get("bulan");
  const bulan = parseMonth(rawMonth);

  if (rawMonth !== null && !bulan) {
    return new NextResponse("Bulan tidak valid. Gunakan format YYYY-MM.", {
      status: 400,
      headers: { "Cache-Control": "no-store" },
    });
  }

  const q = request.nextUrl.searchParams.get("q")?.trim().slice(0, 100) ?? "";
  const escapedSearch = q.replace(/[%_\\]/g, "\\$&");
  const pageSize = 1000;

  const header = ["tanggal", "kategori", "jenis", "nominal", "catatan"];
  function sanitizeCsvField(value: string | null): string {
    if (value === null || value === undefined) return "";
    let str = String(value);

    // Formula injection protection: prefix apostrophe.
    const dangerous = /^[=+\-@\t\r]/.test(str);
    if (dangerous) {
      str = "'" + str;
    }

    // Quote special characters and every apostrophe-prefixed field.
    if (dangerous || /[";\n\r]/.test(str)) {
      str = `"${str.replace(/"/g, '""')}"`;
    }

    return str;
  }

  const lines = [header.join(";")];

  try {
    for (let offset = 0; ; offset += pageSize) {
      let query = supabase
        .from("transactions")
        .select("occurred_on, amount, note, category:categories(name, type)");

      if (bulan) {
        query = query
          .gte("occurred_on", `${bulan}-01`)
          .lt("occurred_on", `${shiftMonth(bulan, 1)}-01`);
      }

      if (q) {
        query = query.ilike("note", `%${escapedSearch}%`);
      }

      const { data, error } = await query
        .order("occurred_on", { ascending: false })
        .order("created_at", { ascending: false })
        .order("id", { ascending: false })
        .range(offset, offset + pageSize - 1)
        .overrideTypes<ExportTransaction[], { merge: false }>();

      if (error) {
        throw new Error("Transaction export failed");
      }

      const rows = data ?? [];

      for (const row of rows) {
        lines.push([
          row.occurred_on,
          sanitizeCsvField(row.category?.name ?? ""),
          row.category?.type === "income" ? "Pemasukan" : "Pengeluaran",
          String(row.amount),
          sanitizeCsvField(row.note),
        ].join(";"));
      }

      if (rows.length < pageSize) break;
    }
  } catch {
    return new NextResponse("Gagal mengambil data transaksi.", {
      status: 500,
      headers: { "Cache-Control": "no-store" },
    });
  }

  // BOM di awal supaya Excel (khususnya versi Windows) baca UTF-8 dengan benar.
  const csv = "\uFEFF" + lines.join("\r\n");
  const date = todayInJakarta();

  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="transaksi-${date}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
