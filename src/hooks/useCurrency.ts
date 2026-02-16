"use client";

import { useAuth } from "@/contexts/AuthContext";

const CURRENCY_CONFIG: Record<
  string,
  { symbol: string; locale: string; code: string }
> = {
  EUR: { symbol: "€", locale: "de-DE", code: "EUR" },
  USD: { symbol: "$", locale: "en-US", code: "USD" },
  GBP: { symbol: "£", locale: "en-GB", code: "GBP" },
  JPY: { symbol: "¥", locale: "ja-JP", code: "JPY" },
};

const DEFAULT_CONFIG = CURRENCY_CONFIG.EUR;

export function useCurrency() {
  const { user } = useAuth();
  const config = CURRENCY_CONFIG[user?.currency ?? "EUR"] ?? DEFAULT_CONFIG;

  const formatAmount = (value: number, decimals = 2): string => {
    return new Intl.NumberFormat(config.locale, {
      style: "currency",
      currency: config.code,
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    }).format(value);
  };

  return {
    currency: config.code,
    locale: config.locale,
    symbol: config.symbol,
    formatAmount,
  };
}
