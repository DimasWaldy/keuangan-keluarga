export type TransactionCategory = {
  id: string;
  name: string;
  type: "income" | "expense";
};

export type TransactionActionState = {
  error: string | null;
};

export type Transaction = {
  id: string;
  category_id: string;
  amount: number | string;
  occurred_on: string;
  note: string | null;
  category: Pick<TransactionCategory, "name" | "type"> | null;
};
