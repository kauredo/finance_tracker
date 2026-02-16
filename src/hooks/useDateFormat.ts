"use client";

import { useAuth } from "@/contexts/AuthContext";
import { format as dateFnsFormat } from "date-fns";

const FORMAT_MAP: Record<string, { long: string; short: string }> = {
  "DD/MM/YYYY": { long: "d MMMM yyyy", short: "dd/MM/yyyy" },
  "MM/DD/YYYY": { long: "MMMM d, yyyy", short: "MM/dd/yyyy" },
  "YYYY-MM-DD": { long: "yyyy MMMM d", short: "yyyy-MM-dd" },
};

const DEFAULT_FORMAT = FORMAT_MAP["DD/MM/YYYY"];

export function useDateFormat() {
  const { user } = useAuth();
  const config = FORMAT_MAP[user?.dateFormat ?? "DD/MM/YYYY"] ?? DEFAULT_FORMAT;

  const formatDate = (
    date: Date | string,
    style: "long" | "short" = "long",
  ): string => {
    const d = typeof date === "string" ? new Date(date) : date;
    return dateFnsFormat(d, config[style]);
  };

  return { formatDate, longFormat: config.long, shortFormat: config.short };
}
