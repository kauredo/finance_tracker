"use client";

import { Card } from "@/components/ui/Card";

interface DateRangePickerProps {
  startDate: string;
  endDate: string;
  onChange: (startDate: string, endDate: string) => void;
  onPresetChange?: (
    preset: "week" | "month" | "quarter" | "year" | "all",
  ) => void;
}

export default function DateRangePicker({
  startDate,
  endDate,
  onChange,
  onPresetChange,
}: DateRangePickerProps) {
  const presets = [
    { label: "Last 7 days", value: "week" as const },
    { label: "Last month", value: "month" as const },
    { label: "Last 3 months", value: "quarter" as const },
    { label: "Last year", value: "year" as const },
    { label: "All time", value: "all" as const },
  ];

  return (
    <Card variant="glass" className="p-4">
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-foreground mb-2">
            Quick Select
          </label>
          <div className="flex flex-wrap gap-2">
            {presets.map((preset) => (
              <button
                key={preset.value}
                onClick={() => onPresetChange?.(preset.value)}
                className="px-3 py-1.5 text-sm rounded-lg bg-surface hover:bg-surface-alt text-foreground border border-border transition-colors"
              >
                {preset.label}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Start Date
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => onChange(e.target.value, endDate)}
              className="w-full px-3 py-2 rounded-lg bg-surface border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              End Date
            </label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => onChange(startDate, e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-surface border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>
        </div>
      </div>
    </Card>
  );
}
