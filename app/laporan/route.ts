import { NextResponse, type NextRequest } from "next/server";
import { PDFDocument, StandardFonts, rgb, type RGB } from "pdf-lib";
import { createClient } from "@/utils/supabase/server";
import {
  currentMonthInJakarta,
  formatMonthId,
  parseMonth,
  shiftMonth,
} from "@/utils/date";

type ReportTransaction = {
  occurred_on: string;
  amount: number | string;
  note: string | null;
  category: { name: string; type: string } | null;
};

function errorResponse(message: string, status: number) {
  return new NextResponse(message, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return errorResponse("Harus login terlebih dahulu.", 401);
  }

  const bulan = parseMonth(request.nextUrl.searchParams.get("bulan"))
    ?? currentMonthInJakarta();
  const monthStart = `${bulan}-01`;
  const nextMonthStart = `${shiftMonth(bulan, 1)}-01`;

  try {
    // Aggregate in SQL so the summary is independent of the API row limit.
    const { data: summaryData, error: summaryError } = await supabase.rpc(
      "monthly_summary",
      { p_month: monthStart },
    );
    const summary = Array.isArray(summaryData) ? summaryData[0] : null;

    if (summaryError || !summary || ![summary.income, summary.expense, summary.net].every(
      (value) => (typeof value === "string" || typeof value === "number")
        && Number.isFinite(Number(value)),
    )) {
      return errorResponse("Gagal mengambil ringkasan bulanan.", 500);
    }

    const rows: ReportTransaction[] = [];
    let offset = 0;

    // Use the returned count and actual batch length, even with a lower API cap.
    while (true) {
      const { data, error, count } = await supabase
        .from("transactions")
        .select("occurred_on, amount, note, category:categories(name, type)", { count: "exact" })
        .gte("occurred_on", monthStart)
        .lt("occurred_on", nextMonthStart)
        .order("occurred_on", { ascending: true })
        .order("created_at", { ascending: true })
        .order("id", { ascending: true })
        .range(offset, offset + 499)
        .overrideTypes<ReportTransaction[], { merge: false }>();

      if (error || count === null || (!data?.length && offset < count)) {
        return errorResponse("Gagal mengambil data transaksi.", 500);
      }

      rows.push(...(data ?? []));
      offset += data?.length ?? 0;
      if (offset >= count) break;
    }

    const pdf = await PDFDocument.create();
    const font = await pdf.embedFont(StandardFonts.Helvetica);
    const fontBold = await pdf.embedFont(StandardFonts.HelveticaBold);
    const supportedCharacters = new Set(font.getCharacterSet());
    const title = `Laporan Bulanan ${formatMonthId(bulan)}`;
    pdf.setTitle(title);
    pdf.setAuthor("My Money Money");

    const pageWidth = 595.28;
    const pageHeight = 841.89;
    const margin = 50;
    const contentWidth = pageWidth - margin * 2;
    const green = rgb(0.06, 0.72, 0.51);
    const red = rgb(0.94, 0.27, 0.27);
    const muted = rgb(0.4, 0.4, 0.4);
    let page = pdf.addPage([pageWidth, pageHeight]);
    let cursorY = pageHeight - margin;

    const formatRp = (value: number | string) => {
      const numeric = Number(value);
      const formatted = new Intl.NumberFormat("id-ID", {
        style: "currency",
        currency: "IDR",
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(Math.abs(numeric)).replace(/^Rp\s+/, "Rp");
      return numeric < 0 ? `-${formatted}` : formatted;
    };

    // Standard Helvetica cannot encode emoji or every script; avoid a failed PDF.
    const safeText = (text: string) => Array.from(text.replace(/\s+/g, " ").trim())
      .map((character) => supportedCharacters.has(character.codePointAt(0)!) ? character : "?")
      .join("");

    const fitText = (text: string, width: number, size = 9) => {
      const clean = safeText(text);
      if (font.widthOfTextAtSize(clean, size) <= width) return clean;
      let shortened = clean;
      while (shortened && font.widthOfTextAtSize(`${shortened}...`, size) > width) {
        shortened = shortened.slice(0, -1);
      }
      return `${shortened}...`;
    };

    const drawText = (
      text: string,
      x: number,
      y: number,
      options: { size?: number; bold?: boolean; color?: RGB } = {},
    ) => {
      page.drawText(safeText(text), {
        x, y,
        size: options.size ?? 10,
        font: options.bold ? fontBold : font,
        color: options.color ?? rgb(0, 0, 0),
      });
    };

    drawText("My Money Money", margin, cursorY, { size: 20, bold: true, color: green });
    cursorY -= 24;
    drawText(title, margin, cursorY, { size: 12 });
    cursorY -= 30;

    const boxWidth = (contentWidth - 20) / 3;
    const boxHeight = 60;
    const boxY = cursorY - boxHeight;
    const drawBox = (label: string, value: string, x: number, accent: RGB) => {
      page.drawRectangle({
        x, y: boxY, width: boxWidth, height: boxHeight,
        borderColor: rgb(0.9, 0.9, 0.9), borderWidth: 1,
      });
      page.drawCircle({ x: x + 13, y: boxY + 43, size: 3, color: accent });
      drawText(label, x + 23, boxY + 40, { size: 9, color: muted });
      const size = Math.min(13, 13 * (boxWidth - 20) / fontBold.widthOfTextAtSize(value, 13));
      drawText(value, x + 10, boxY + 16, { size, bold: true });
    };

    drawBox("Pemasukan", formatRp(summary.income), margin, green);
    drawBox("Pengeluaran", formatRp(summary.expense), margin + boxWidth + 10, red);
    drawBox("Selisih tercatat", formatRp(summary.net), margin + (boxWidth + 10) * 2, muted);
    cursorY = boxY - 30;

    const columns = [0, 65, 170, 235, 355];
    const drawTableHeader = () => {
      ["Tanggal", "Kategori", "Jenis", "Nominal", "Catatan"].forEach((label, index) => {
        drawText(label, margin + columns[index], cursorY, { bold: true });
      });
      cursorY -= 6;
      page.drawLine({
        start: { x: margin, y: cursorY },
        end: { x: margin + contentWidth, y: cursorY },
        thickness: 0.5, color: rgb(0.7, 0.7, 0.7),
      });
      cursorY -= 16;
    };

    drawTableHeader();

    if (rows.length === 0) {
      drawText("Belum ada transaksi di bulan ini.", margin, cursorY, { color: muted });
    }

    for (const transaction of rows) {
      if (cursorY < margin + 40) {
        page = pdf.addPage([pageWidth, pageHeight]);
        cursorY = pageHeight - margin;
        drawText(title, margin, cursorY, { size: 12, bold: true });
        cursorY -= 26;
        drawTableHeader();
      }

      const income = transaction.category?.type === "income";
      const date = transaction.occurred_on.split("-").reverse().join("/");
      const amount = formatRp(transaction.amount);
      drawText(date, margin, cursorY, { size: 9 });
      drawText(fitText(transaction.category?.name ?? "-", 95), margin + 65, cursorY, { size: 9 });
      drawText(income ? "Pemasukan" : "Pengeluaran", margin + 170, cursorY, { size: 9, color: income ? green : red });
      drawText(amount, margin + 345 - font.widthOfTextAtSize(amount, 9), cursorY, { size: 9 });
      drawText(fitText(transaction.note ?? "", contentWidth - 355), margin + 355, cursorY, { size: 9, color: muted });
      cursorY -= 16;
    }

    const createdDate = new Intl.DateTimeFormat("id-ID", {
      timeZone: "Asia/Jakarta", day: "numeric", month: "long", year: "numeric",
    }).format(new Date());
    const pages = pdf.getPages();
    pages.forEach((pdfPage, index) => {
      pdfPage.drawText(`Dibuat pada ${createdDate}`, { x: margin, y: margin - 10, size: 8, font, color: muted });
      const pageNumber = `${index + 1} / ${pages.length}`;
      pdfPage.drawText(pageNumber, {
        x: pageWidth - margin - font.widthOfTextAtSize(pageNumber, 8),
        y: margin - 10, size: 8, font, color: muted,
      });
    });

    const pdfBytes = await pdf.save();
    return new NextResponse(new Uint8Array(pdfBytes), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="laporan-${bulan}.pdf"`,
        "Cache-Control": "no-store",
      },
    });
  } catch {
    return errorResponse("Gagal membuat laporan PDF. Silakan coba lagi.", 500);
  }
}
