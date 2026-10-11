export type ExtractedTransaction = {
  amount: string;
  occurred_on: string;
  note: string | null;
  category_hint: string | null;
};

export type OcrActionState = {
  error: string | null;
  transactions: ExtractedTransaction[] | null;
  raw: string | null;
};
