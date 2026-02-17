"use client";

import { useMemo, useState } from "react";
import { useCurrency } from "@/hooks/useCurrency";

interface SpendingHeatmapProps {
  transactions: { date: string; amount: number }[];
}

const DAY_LABELS = ["", "M", "", "W", "", "F", ""];

function getColorForIntensity(intensity: number): string {
  // 0 = no spend (sand), 1 = max spend (warm rose)
  // 5-stop scale: sand → clay → pink-light → primary → expense
  if (intensity === 0) return "var(--sand)";
  if (intensity < 0.25) return "var(--clay)";
  if (intensity < 0.5) return "var(--primary-light)";
  if (intensity < 0.75) return "var(--primary)";
  return "var(--expense)";
}

export default function SpendingHeatmap({
  transactions,
}: SpendingHeatmapProps) {
  const { formatAmount } = useCurrency();
  const [tooltip, setTooltip] = useState<{
    x: number;
    y: number;
    date: string;
    amount: number;
  } | null>(null);

  const { grid, monthLabels, maxSpend } = useMemo(() => {
    // Build daily spending map
    const dailyMap = new Map<string, number>();
    for (const tx of transactions) {
      if (tx.amount < 0) {
        const key = tx.date;
        dailyMap.set(key, (dailyMap.get(key) ?? 0) + Math.abs(tx.amount));
      }
    }

    // Last ~13 weeks (91 days) ending today
    const today = new Date();
    const endDay = new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate(),
    );

    // Find the Sunday at or before 91 days ago
    const rawStart = new Date(endDay);
    rawStart.setDate(rawStart.getDate() - 90);
    const startDay = new Date(rawStart);
    startDay.setDate(startDay.getDate() - startDay.getDay()); // back to Sunday

    // Build grid: columns = weeks, rows = day of week (0=Sun..6=Sat)
    const weeks: {
      date: string;
      amount: number;
      dayOfWeek: number;
      isInRange: boolean;
    }[][] = [];

    let current = new Date(startDay);
    let currentWeek: typeof weeks[0] = [];

    while (current <= endDay) {
      const dateStr = current.toISOString().split("T")[0];
      const dow = current.getDay();

      if (dow === 0 && currentWeek.length > 0) {
        weeks.push(currentWeek);
        currentWeek = [];
      }

      currentWeek.push({
        date: dateStr,
        amount: dailyMap.get(dateStr) ?? 0,
        dayOfWeek: dow,
        isInRange: current >= rawStart && current <= endDay,
      });

      current = new Date(current);
      current.setDate(current.getDate() + 1);
    }
    if (currentWeek.length > 0) weeks.push(currentWeek);

    // Max spend for color scaling
    let peak = 0;
    for (const [, val] of dailyMap) {
      if (val > peak) peak = val;
    }

    // Month labels: find the first occurrence of each month
    const labels: { label: string; weekIndex: number }[] = [];
    let lastMonth = -1;
    weeks.forEach((week, wi) => {
      for (const day of week) {
        const d = new Date(day.date);
        const m = d.getMonth();
        if (m !== lastMonth) {
          lastMonth = m;
          labels.push({
            label: d.toLocaleDateString("en-US", { month: "short" }),
            weekIndex: wi,
          });
          break;
        }
      }
    });

    return { grid: weeks, monthLabels: labels, maxSpend: peak };
  }, [transactions]);

  const cellSize = 13;
  const cellGap = 3;
  const labelWidth = 24;
  const headerHeight = 18;
  const totalWidth =
    labelWidth + grid.length * (cellSize + cellGap);
  const totalHeight = headerHeight + 7 * (cellSize + cellGap);

  return (
    <div className="relative">
      <div className="overflow-x-auto">
        <svg
          width={totalWidth}
          height={totalHeight}
          className="block"
          role="img"
          aria-label="Spending heatmap showing daily expense intensity over the last 90 days"
          onMouseLeave={() => setTooltip(null)}
        >
          {/* Month labels */}
          {monthLabels.map((ml) => (
            <text
              key={`${ml.label}-${ml.weekIndex}`}
              x={labelWidth + ml.weekIndex * (cellSize + cellGap)}
              y={12}
              className="fill-[var(--text-secondary)]"
              fontSize={10}
              fontWeight={500}
            >
              {ml.label}
            </text>
          ))}

          {/* Day-of-week labels */}
          {DAY_LABELS.map((label, i) =>
            label ? (
              <text
                key={i}
                x={0}
                y={headerHeight + i * (cellSize + cellGap) + cellSize - 2}
                className="fill-[var(--text-secondary)]"
                fontSize={9}
                fontWeight={500}
              >
                {label}
              </text>
            ) : null,
          )}

          {/* Cells */}
          {grid.map((week, wi) =>
            week.map((day) => {
              const intensity =
                maxSpend > 0 ? day.amount / maxSpend : 0;
              const x = labelWidth + wi * (cellSize + cellGap);
              const y =
                headerHeight + day.dayOfWeek * (cellSize + cellGap);

              return (
                <rect
                  key={day.date}
                  x={x}
                  y={y}
                  width={cellSize}
                  height={cellSize}
                  rx={2.5}
                  fill={
                    day.isInRange
                      ? getColorForIntensity(intensity)
                      : "transparent"
                  }
                  className="transition-opacity duration-150"
                  opacity={day.isInRange ? 1 : 0}
                  onMouseEnter={(e) => {
                    if (!day.isInRange) return;
                    const rect = (
                      e.target as SVGRectElement
                    ).getBoundingClientRect();
                    const parent = (
                      e.target as SVGRectElement
                    ).closest(".relative")!.getBoundingClientRect();
                    setTooltip({
                      x: rect.left - parent.left + cellSize / 2,
                      y: rect.top - parent.top - 4,
                      date: day.date,
                      amount: day.amount,
                    });
                  }}
                  onMouseLeave={() => setTooltip(null)}
                />
              );
            }),
          )}
        </svg>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-2 mt-3 text-[10px] text-[var(--text-secondary)]">
        <span className="text-[11px] font-medium mr-1">Last 90 days</span>
        <span>Less</span>
        {[0, 0.15, 0.4, 0.65, 0.9].map((v, i) => (
          <div
            key={i}
            className="w-[11px] h-[11px] rounded-[2px]"
            style={{ background: getColorForIntensity(v) }}
          />
        ))}
        <span>More</span>
      </div>

      {/* Tooltip */}
      {tooltip && (
        <div
          className="absolute pointer-events-none z-10 px-2.5 py-1.5 rounded-lg bg-[var(--surface)] border border-[var(--border)] shadow-sm text-xs"
          style={{
            left: tooltip.x,
            top: tooltip.y,
            transform: "translate(-50%, -100%)",
          }}
        >
          <p className="font-medium text-[var(--foreground)]">
            {new Date(tooltip.date + "T12:00:00").toLocaleDateString(
              "en-US",
              {
                month: "short",
                day: "numeric",
                weekday: "short",
              },
            )}
          </p>
          <p className="text-[var(--text-secondary)]">
            {tooltip.amount > 0
              ? formatAmount(tooltip.amount)
              : "No spending"}
          </p>
        </div>
      )}
    </div>
  );
}
