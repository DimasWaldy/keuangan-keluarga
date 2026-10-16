import Link from "next/link";

export type BudgetStatus = {
  budget_id: string;
  category_id: string;
  category_name: string;
  budget_amount: number | string;
  spent_amount: number | string;
  percentage: number | string;
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

function BudgetBar(item: BudgetStatus) {
  const pct = Number(item.percentage);
  const isOver = pct >= 100;
  const isWarning = pct >= 80 && pct < 100;
  const barWidth = Math.min(pct, 100);
  const barColor = isOver
    ? "bg-red-500"
    : isWarning
      ? "bg-yellow-600 dark:bg-yellow-500"
      : "bg-primary";

  return (
    <li className="space-y-2">
      <div className="flex flex-col gap-1 text-sm sm:flex-row sm:justify-between sm:gap-4">
        <span className="min-w-0 break-words font-medium">{item.category_name}</span>
        <span className="break-words text-muted-foreground tabular-nums sm:text-right">
          {formatRupiah(item.spent_amount)} / {formatRupiah(item.budget_amount)} ({pct.toFixed(0)}%)
        </span>
      </div>
      <div
        role="progressbar"
        aria-label={`Pemakaian budget ${item.category_name}`}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={barWidth}
        aria-valuetext={`${pct.toFixed(0)}% dari budget`}
        className="h-2 w-full overflow-hidden rounded-full bg-border"
      >
        <div
          className={`h-full ${barColor} transition-[width] duration-500 ease-out`}
          style={{ width: `${barWidth}%` }}
        />
      </div>
      {isOver && (
        <p className="text-xs text-red-500">
          Over budget sebesar {formatRupiah(Number(item.spent_amount) - Number(item.budget_amount))}
        </p>
      )}
    </li>
  );
}

export function BudgetProgress({ data }: { data: BudgetStatus[] }) {
  if (data.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Belum ada budget. Set di halaman{" "}
        <Link href="/budget" className="font-medium text-primary underline underline-offset-4">
          Budget
        </Link>
        .
      </p>
    );
  }

  return (
    <section className="space-y-4 rounded-xl border border-border bg-card p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold">Budget bulan ini</h2>
        <Link href="/budget" className="text-sm text-muted-foreground transition-colors hover:text-primary">
          Atur budget
        </Link>
      </div>
      <ul className="space-y-4">
        {data.map((item) => <BudgetBar key={item.budget_id} {...item} />)}
      </ul>
    </section>
  );
}
