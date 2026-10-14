type ExpenseCategory = {
  category_id: string;
  category_name: string;
  total: number | string;
};

type ChartItem = ExpenseCategory & {
  total: number;
  isOther?: boolean;
};

function formatRupiah(value: number) {
  const formatted = new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Math.abs(value));
  const withoutSpace = formatted.replace(/^Rp\s+/, "Rp");

  return value < 0 ? `-${withoutSpace}` : withoutSpace;
}

export function ExpenseChart({ data }: { data: ExpenseCategory[] }) {
  const categories = data
    .map((category) => ({
      ...category,
      total: Number(category.total),
    }))
    .filter((category) => Number.isFinite(category.total) && category.total > 0)
    .sort((a, b) => b.total - a.total);

  const topCategories = categories.slice(0, 5);
  const otherTotal = categories
    .slice(5)
    .reduce((total, category) => total + category.total, 0);
  const chartItems: ChartItem[] = otherTotal > 0
    ? [
        ...topCategories,
        {
          category_id: "other",
          category_name: "Lainnya",
          total: otherTotal,
          isOther: true,
        },
      ]
    : topCategories;
  const total = chartItems.reduce((sum, category) => sum + category.total, 0);

  return (
    <section
      aria-labelledby="expense-chart-title"
      className="rounded-[1.5rem] border border-border bg-card p-5 shadow-[var(--shadow)] sm:p-6"
    >
      <style>{`
        @keyframes expense-bar-reveal {
          from { transform: scaleX(0); }
          to { transform: scaleX(1); }
        }

        @media (prefers-reduced-motion: reduce) {
          .expense-chart-bar { animation: none !important; }
        }
      `}</style>

      <div className="mb-5">
        <h2 id="expense-chart-title" className="text-lg font-semibold text-foreground">
          Pengeluaran per kategori
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Total pengeluaran: {formatRupiah(total)}
        </p>
      </div>

      {chartItems.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Belum ada pengeluaran di bulan ini.
        </p>
      ) : (
        <div className="space-y-4">
          {chartItems.map((category) => {
            const percentage = (category.total / total) * 100;

            return (
              <div key={category.category_id} className="flex items-center gap-3">
                <p
                  className="w-24 shrink-0 truncate text-sm font-medium text-foreground sm:w-36"
                  title={category.category_name}
                >
                  {category.category_name}
                </p>
                <div className="h-2.5 min-w-0 flex-1 overflow-hidden rounded-full bg-muted">
                  <div
                    className={`expense-chart-bar h-full rounded-full ${
                      category.isOther ? "bg-muted-foreground/40" : ""
                    }`}
                    style={{
                      width: `${percentage}%`,
                      background: category.isOther
                        ? undefined
                        : "linear-gradient(90deg, var(--primary), var(--primary-hover))",
                      animation: "expense-bar-reveal 500ms ease-out both",
                      transformOrigin: "left",
                    }}
                  />
                </div>
                <p className="w-12 shrink-0 text-right text-sm tabular-nums text-muted-foreground">
                  {percentage.toFixed(1)}%
                </p>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
