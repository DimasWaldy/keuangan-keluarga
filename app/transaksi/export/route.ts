import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return new NextResponse("Harus login terlebih dahulu.", { status: 401 });
  }

  const { data, error } = await supabase
    .from("transactions")
    .select("occurred_on, amount, note, category:categories(name, type)")
    .order("occurred_on", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(10000);

  if (error) {
    return new NextResponse("Gagal mengambil data transaksi.", { status: 500 });
  }

  const rows = (data ?? []) as unknown as Array<{
    occurred_on: string;
    amount: string | number;
    note: string | null;
    category: { name: string; type: string } | null;
  }>;

  const header = ["tanggal", "kategori", "jenis", "nominal", "catatan"];
  const escapeCsv = (value: string | null) => {
    if (value === null || value === undefined) return "";
    const str = String(value);

    // CSV escape: kalau ada koma, kutip, atau newline, bungkus dengan "
    // dan dobel-kan kutip di dalamnya.
    if (/[";\n\r]/.test(str)) {
      return `"${str.replace(/"/g, '""')}"`;
    }

    return str;
  };

  const lines = [header.join(";")];

  for (const row of rows) {
    const jenis = row.category?.type === "income" ? "Pemasukan" : "Pengeluaran";
    const nominal = String(row.amount);

    lines.push(
      [
        row.occurred_on,
        escapeCsv(row.category?.name ?? ""),
        jenis,
        nominal,
        escapeCsv(row.note),
      ].join(";"),
    );
  }

  // BOM di awal supaya Excel (khususnya versi Windows) baca UTF-8 dengan benar.
  const csv = "\uFEFF" + lines.join("\r\n");
  const date = new Date().toISOString().slice(0, 10);

  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="transaksi-${date}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
