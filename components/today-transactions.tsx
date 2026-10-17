import { EmptyState } from "@/components/empty-state";
import Link from "next/link";

export type TodayTransaction = {
  id: string;
  amount: number | string;
  note: string | null;
  category: { name: string; type: string } | null;
};

function formatRupiah(value: number | string) {
  const numeric = Number(value);
  const formatted = new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Math.abs(numeric));
  const withoutSpace = formatted.replace(/^Rp\s+/, "Rp");
  return numeric < 0 ? `-${withoutSpace}` : withoutSpace;
}

export function TodayTransactions({ data }: { data: TodayTransaction[] }) {
  const { totalIncome, totalExpense } = data.reduce(
    (totals, transaction) => {
      if (transaction.category?.type === "income") {
        totals.totalIncome += Number(transaction.amount);
      } else if (transaction.category?.type === "expense") {
        totals.totalExpense += Number(transaction.amount);
      }
      return totals;
    },
    { totalIncome: 0, totalExpense: 0 },
  );

  return (
    <section className="space-y-4 rounded-xl border border-border bg-card p-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-semibold">Hari ini</h2>
        <Link href="/transaksi#transactions-heading" className="inline-flex min-h-11 items-center text-sm font-medium text-primary transition-colors hover:underline">
          Lihat riwayat
        </Link>
      </div>

      <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm">
        <span className="flex flex-wrap items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-primary" />
          Pemasukan: <strong className="tabular-nums">{formatRupiah(totalIncome)}</strong>
        </span>
        <span className="flex flex-wrap items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-red-500" />
          Pengeluaran: <strong className="tabular-nums">{formatRupiah(totalExpense)}</strong>
        </span>
      </div>

      <ul className="divide-y divide-border">
        {data.slice(0, 5).map((transaction) => (
          <li key={transaction.id} className="flex flex-col items-start gap-2 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
            <div className="min-w-0 max-w-full">
              <p className="truncate font-medium">{transaction.category?.name ?? "Tanpa kategori"}</p>
              {transaction.note && (
                <p className="truncate text-xs text-muted-foreground">{transaction.note}</p>
              )}
            </div>
            <p className={`max-w-full break-words text-sm font-medium tabular-nums sm:text-base ${transaction.category?.type === "income" ? "text-primary" : "text-foreground"}`}>
              {transaction.category?.type === "income" ? "+" : "−"}{formatRupiah(transaction.amount)}
            </p>
          </li>
        ))}
      </ul>

      {data.length > 5 && (
        <p className="text-xs text-muted-foreground">
          +{data.length - 5} transaksi lainnya
        </p>
      )}

      {data.length === 0 && (
        <EmptyState
          title="Belum ada transaksi hari ini"
          description="Mulai dari pemasukan atau pengeluaran pertamamu hari ini."
          href="/transaksi#add-transaction-heading"
          action="Catat transaksi"
        />
      )}
    </section>
  );
}
