export type TrendDataPoint = {
  month_start: string;
  income: number | string;
  expense: number | string;
};

function formatMonth(monthStart: string) {
  return new Intl.DateTimeFormat("id-ID", {
    month: "short",
    timeZone: "UTC",
  }).format(new Date(`${monthStart}T00:00:00Z`));
}

function formatRupiah(value: number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value).replace(/^Rp\s+/, "Rp");
}

export function TrendChart({
  data,
  title,
  months,
  error,
}: {
  data: TrendDataPoint[];
  title: string;
  months: string[];
  error?: string | null;
}) {
  const points = months.map((monthStart) => {
    const point = data.find((item) => item.month_start === monthStart);

    return {
      month_start: monthStart,
      income: Number(point?.income ?? 0),
      expense: Number(point?.expense ?? 0),
    };
  });
  const maxValue = Math.max(
    ...points.map((point) => point.income),
    ...points.map((point) => point.expense),
    1,
  );
  const isEmpty = points.every(
    (point) => point.income === 0 && point.expense === 0,
  );

  function y(value: number) {
    return 190 - (value / maxValue) * 170;
  }

  function x(index: number) {
    return 20 + ((index + 0.5) * (580 - 20)) / Math.max(points.length, 1);
  }

  const series = [
    { key: "income", label: "Pemasukan", color: "var(--primary)" },
    { key: "expense", label: "Pengeluaran", color: "var(--danger)" },
  ] as const;

  return (
    <section
      aria-labelledby="trend-chart-heading"
      className="rounded-xl border border-border bg-card p-6"
    >
      <h2 id="trend-chart-heading" className="text-lg font-semibold text-foreground">
        {title}
      </h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Dua batang tiap bulan: pemasukan hijau dan pengeluaran merah, hingga bulan yang dipilih.
      </p>

      <div className="mt-4 flex flex-wrap gap-4 text-sm text-muted-foreground">
        {series.map((item) => (
          <span key={item.key} className="inline-flex items-center gap-2">
            <span
              aria-hidden="true"
              className="h-2 w-2 rounded-full"
              style={{ backgroundColor: item.color }}
            />
            {item.label}
          </span>
        ))}
      </div>

      {error ? (
        <p role="alert" className="mt-4 text-sm text-danger">
          {error}
        </p>
      ) : isEmpty && (
        <p className="mt-4 text-sm text-muted-foreground">
          Belum ada data untuk grafik tren.
        </p>
      )}

      <svg
        viewBox="0 0 600 220"
        className="w-full h-auto"
        role="img"
        aria-labelledby="trend-chart-heading"
      >
        {[0, 1, 2, 3].map((index) => (
          <line
            key={index}
            x1={20}
            x2={580}
            y1={20 + (index * 170) / 3}
            y2={20 + (index * 170) / 3}
            stroke="var(--border)"
            strokeWidth={1}
            strokeDasharray="3 3"
          />
        ))}

        {points.map((point, index) => (
          <g key={point.month_start}>
            {series.map((item, seriesIndex) => {
              const left = x(index) + (seriesIndex === 0 ? -20 : 4);
              const value = point[item.key];

              return (
                <g key={item.key}>
                  <title>
                    {`${formatMonth(point.month_start)} — ${item.label}: ${error ? "Data belum tersedia" : formatRupiah(value)}`}
                  </title>
                  {!error && value > 0 ? (
                    <rect
                      x={left}
                      y={y(value)}
                      width={16}
                      height={190 - y(value)}
                      rx={3}
                      fill={item.color}
                    />
                  ) : (
                    <line
                      x1={left}
                      x2={left + 16}
                      y1={190}
                      y2={190}
                      stroke={error ? "var(--border)" : item.color}
                      strokeWidth={2}
                      strokeLinecap="round"
                    />
                  )}
                </g>
              );
            })}
          </g>
        ))}

        {points.map((point, index) => (
          <text
            key={point.month_start}
            x={x(index)}
            y={210}
            textAnchor="middle"
            fontSize={11}
            fill="var(--muted-foreground)"
          >
            {formatMonth(point.month_start)}
          </text>
        ))}
      </svg>
    </section>
  );
}
