import "server-only";

const prompt = `Ekstrak transaksi keuangan dari gambar ini. Balas JSON sesuai skema.
Aturan:
- amount: angka positif dalam format string desimal, tanpa pemisah ribuan,
  titik sebagai desimal. Contoh: "15000.00".
- occurred_on: format YYYY-MM-DD. Kalau tidak ada tanggal di gambar, pakai
  tanggal hari ini (Asia/Jakarta).
- note: maksimal 200 karakter, ringkas, Bahasa Indonesia.
- category_hint: satu kata atau frasa pendek Bahasa Indonesia untuk kategori
  (mis "Makan", "Transportasi", "Gaji"). Boleh null.
- Kalau tidak ada transaksi yang bisa diekstrak, kembalikan array kosong.`;

const responseSchema = {
  type: "object",
  properties: {
    transactions: {
      type: "array",
      items: {
        type: "object",
        properties: {
          amount: { type: "string" },
          occurred_on: { type: "string" },
          note: { type: "string", nullable: true },
          category_hint: { type: "string", nullable: true },
        },
        required: ["amount", "occurred_on"],
      },
    },
  },
  required: ["transactions"],
};

function getResponseText(data: unknown): string | null {
  if (!data || typeof data !== "object") {
    return null;
  }

  const candidates = (data as { candidates?: unknown }).candidates;

  if (!Array.isArray(candidates) || candidates.length === 0) {
    return null;
  }

  const candidate = candidates[0];

  if (!candidate || typeof candidate !== "object") {
    return null;
  }

  const content = (candidate as { content?: unknown }).content;

  if (!content || typeof content !== "object") {
    return null;
  }

  const parts = (content as { parts?: unknown }).parts;

  if (!Array.isArray(parts) || parts.length === 0) {
    return null;
  }

  const part = parts[0];

  if (!part || typeof part !== "object") {
    return null;
  }

  const text = (part as { text?: unknown }).text;
  return typeof text === "string" ? text : null;
}

export async function extractTransactionsFromImage(
  imageBase64: string,
  mimeType: string,
): Promise<{ ok: true; data: unknown } | { ok: false; error: string }> {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    return { ok: false, error: "Konfigurasi OCR tidak tersedia." };
  }

  let response: Response;

  try {
    response = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": apiKey,
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                { text: prompt },
                {
                  inlineData: {
                    mimeType,
                    data: imageBase64,
                  },
                },
              ],
            },
          ],
          generationConfig: {
            responseMimeType: "application/json",
            responseSchema,
          },
        }),
      },
    );
  } catch {
    return { ok: false, error: "Permintaan OCR gagal." };
  }

  if (!response.ok) {
    const body = await response.text();
    console.error("[gemini] HTTP", response.status, "body:", body.slice(0, 500));
    return { ok: false, error: `Status HTTP ${response.status}.` };
  }

  try {
    const responseData: unknown = await response.json();
    const text = getResponseText(responseData);

    if (!text) {
      return { ok: false, error: "Hasil OCR tidak dapat dibaca." };
    }

    return { ok: true, data: JSON.parse(text) as unknown };
  } catch {
    return { ok: false, error: "Hasil OCR tidak dapat dibaca." };
  }
}
