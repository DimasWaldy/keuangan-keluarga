import "server-only";

import { todayInJakarta } from "@/utils/date";

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

type ExtractionResult =
  | { ok: true; data: unknown }
  | { ok: false; error: string };

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

async function extractViaGemini(
  imageBase64: string,
  mimeType: string,
  prompt: string,
  overallSignal: AbortSignal,
): Promise<ExtractionResult> {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    return { ok: false, error: "Konfigurasi OCR tidak tersedia." };
  }

  let response: Response;
  let attempt = 0;

  try {
    do {
      overallSignal.throwIfAborted();
      response = await fetch(
        "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent",
        {
          method: "POST",
          signal: AbortSignal.any([AbortSignal.timeout(15000), overallSignal]),
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
      attempt += 1;

      if (
        (response.status !== 503 && response.status !== 429) ||
        attempt === 3
      ) {
        break;
      }

      await new Promise((r) => setTimeout(r, 2000));
    } while (attempt < 3);
  } catch {
    return { ok: false, error: "Permintaan OCR gagal." };
  }

  if (!response.ok) {
    const body = await response.text().catch(() => "");
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

async function extractViaGroq(
  imageBase64: string,
  mimeType: string,
  prompt: string,
  overallSignal: AbortSignal,
): Promise<ExtractionResult> {
  const apiKey = process.env.GROQ_API_KEY;

  if (!apiKey) {
    return { ok: false, error: "Groq key tidak tersedia." };
  }

  let response: Response;

  try {
    overallSignal.throwIfAborted();
    response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      signal: AbortSignal.any([AbortSignal.timeout(15000), overallSignal]),
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "qwen/qwen3.8-27b",
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: `${prompt}\n\nSkema JSON: ${JSON.stringify(responseSchema)}\n\nBalas HANYA JSON valid, tanpa penjelasan.`,
              },
              {
                type: "image_url",
                image_url: { url: `data:${mimeType};base64,${imageBase64}` },
              },
            ],
          },
        ],
        response_format: { type: "json_object" },
        temperature: 0.1,
        max_tokens: 2000,
      }),
    });
  } catch {
    return { ok: false, error: "Permintaan Groq gagal." };
  }

  if (!response.ok) {
    return { ok: false, error: `Groq HTTP ${response.status}.` };
  }

  try {
    const responseData = (await response.json()) as {
      choices?: { message?: { content?: unknown } }[];
    } | null;
    const content = responseData?.choices?.[0]?.message?.content;

    if (typeof content !== "string") {
      return { ok: false, error: "Hasil Groq tidak dapat dibaca." };
    }

    const data: unknown = JSON.parse(content);

    if (
      !data ||
      typeof data !== "object" ||
      !Array.isArray((data as { transactions?: unknown }).transactions)
    ) {
      return { ok: false, error: "Hasil Groq tidak dapat dibaca." };
    }

    return { ok: true, data };
  } catch {
    return { ok: false, error: "Hasil Groq tidak dapat dibaca." };
  }
}

export async function extractTransactionsFromImage(
  imageBase64: string,
  mimeType: string,
): Promise<ExtractionResult> {
  const today = todayInJakarta();
  const prompt = `Ekstrak transaksi keuangan dari gambar ini. Balas JSON sesuai skema.
Aturan:
- amount: angka positif dalam format string desimal, tanpa pemisah ribuan, titik sebagai desimal.
- occurred_on: format YYYY-MM-DD. Kalau tidak ada tanggal di gambar, pakai
  tanggal hari ini yaitu ${today} (Asia/Jakarta).
- note: maksimal 200 karakter, ringkas, Bahasa Indonesia.
- category_hint: satu kata atau frasa pendek Bahasa Indonesia.
- Kalau tidak ada transaksi yang bisa diekstrak, kembalikan array kosong.`;
  // Three Gemini attempts plus Groq could take 64s; leave time for quota release.
  const overallSignal = AbortSignal.timeout(50000);
  const geminiResult = await extractViaGemini(imageBase64, mimeType, prompt, overallSignal);

  if (geminiResult.ok) {
    return geminiResult;
  }

  console.warn("[ocr] Gemini gagal, fallback ke Groq");
  const groqResult = await extractViaGroq(imageBase64, mimeType, prompt, overallSignal);

  if (groqResult.ok) {
    console.info("[ocr] Groq berhasil");
    return groqResult;
  }

  console.warn("[ocr] Groq juga gagal: ", groqResult.error);
  return { ok: false, error: "Gagal memproses gambar. Coba lagi." };
}
