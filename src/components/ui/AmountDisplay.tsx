"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { motion, useSpring, useTransform } from "motion/react";

interface AmountDisplayProps {
  value: number;
  currency?: string;
  locale?: string;
  size?: "sm" | "md" | "lg" | "xl" | "hero";
  variant?: "default" | "income" | "expense" | "neutral";
  animated?: boolean;
  showSign?: boolean;
  className?: string;
}

const sizeStyles = {
  sm: "text-lg",
  md: "text-2xl",
  lg: "text-3xl",
  xl: "text-4xl",
  hero: "text-5xl md:text-6xl",
};

const variantStyles = {
  default: "text-foreground",
  income: "text-growth",
  expense: "text-expense",
  neutral: "text-text-secondary",
};

export function AmountDisplay({
  value,
  currency = "USD",
  locale = "en-US",
  size = "md",
  variant = "default",
  animated = true,
  showSign = false,
  className,
}: AmountDisplayProps) {
  const formatter = new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  // For animated display
  const spring = useSpring(0, { stiffness: 100, damping: 30 });
  const display = useTransform(spring, (v) => {
    const formatted = formatter.format(Math.abs(v));
    if (showSign && value !== 0) {
      return value > 0 ? `+${formatted}` : `-${formatted}`;
    }
    return value < 0 ? `-${formatted.replace("-", "")}` : formatted;
  });

  useEffect(() => {
    spring.set(value);
  }, [spring, value]);

  const formattedValue = () => {
    const formatted = formatter.format(Math.abs(value));
    if (showSign && value !== 0) {
      return value > 0 ? `+${formatted}` : `-${formatted}`;
    }
    return value < 0 ? `-${formatted.replace("-", "")}` : formatted;
  };

  // Determine variant based on value if showing sign
  const effectiveVariant = showSign
    ? value > 0
      ? "income"
      : value < 0
        ? "expense"
        : variant
    : variant;

  return (
    <span
      className={cn(
        "font-mono font-bold tracking-tight tabular-nums",
        sizeStyles[size],
        variantStyles[effectiveVariant],
        className,
      )}
    >
      {animated ? <motion.span>{display}</motion.span> : formattedValue()}
    </span>
  );
}

// Compact amount with trend indicator
interface AmountWithTrendProps {
  value: number;
  previousValue?: number;
  currency?: string;
  locale?: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}

export function AmountWithTrend({
  value,
  previousValue,
  currency = "USD",
  locale = "en-US",
  size = "md",
  className,
}: AmountWithTrendProps) {
  const formatter = new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
  });

  const hasTrend = previousValue !== undefined && previousValue !== 0;
  const percentChange = hasTrend
    ? ((value - previousValue) / Math.abs(previousValue)) * 100
    : 0;
  const isPositive = percentChange > 0;
  const isNegative = percentChange < 0;

  const trendSizes = {
    sm: "text-xs",
    md: "text-sm",
    lg: "text-base",
  };

  return (
    <div className={cn("flex flex-col", className)}>
      <AmountDisplay
        value={value}
        currency={currency}
        locale={locale}
        size={size}
        animated
      />
      {hasTrend && (
        <motion.div
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          className={cn(
            "flex items-center gap-1 mt-1",
            trendSizes[size],
            isPositive
              ? "text-growth"
              : isNegative
                ? "text-expense"
                : "text-muted",
          )}
        >
          {percentChange !== 0 && (
            <svg
              className={cn("w-3.5 h-3.5", isNegative && "rotate-180")}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2.5}
                d="M5 10l7-7m0 0l7 7m-7-7v18"
              />
            </svg>
          )}
          <span className="font-medium">
            {Math.abs(percentChange).toFixed(1)}%
          </span>
          <span className="text-muted">vs prior</span>
        </motion.div>
      )}
    </div>
  );
}

// Balance display with label
interface BalanceDisplayProps {
  label: string;
  value: number;
  currency?: string;
  locale?: string;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  className?: string;
}

export function BalanceDisplay({
  label,
  value,
  currency = "USD",
  locale = "en-US",
  trend,
  className,
}: BalanceDisplayProps) {
  return (
    <div className={cn("", className)}>
      <p className="text-sm text-text-secondary font-medium">{label}</p>
      <div className="flex items-end gap-3 mt-1">
        <AmountDisplay
          value={value}
          currency={currency}
          locale={locale}
          size="xl"
          animated
        />
        {trend && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            className={cn(
              "flex items-center gap-1 text-sm font-medium pb-1",
              trend.isPositive ? "text-growth" : "text-expense",
            )}
          >
            <svg
              className={cn("w-4 h-4", !trend.isPositive && "rotate-180")}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 10l7-7m0 0l7 7m-7-7v18"
              />
            </svg>
            <span>{Math.abs(trend.value)}%</span>
          </motion.div>
        )}
      </div>
    </div>
  );
}

// Inline transaction amount
interface TransactionAmountProps {
  value: number;
  type: "income" | "expense";
  currency?: string;
  locale?: string;
  className?: string;
}

export function TransactionAmount({
  value,
  type,
  currency = "USD",
  locale = "en-US",
  className,
}: TransactionAmountProps) {
  const formatter = new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
  });

  const formatted = formatter.format(Math.abs(value));
  const display = type === "income" ? `+${formatted}` : `-${formatted}`;

  return (
    <span
      className={cn(
        "font-mono font-semibold tabular-nums",
        type === "income" ? "text-growth" : "text-expense",
        className,
      )}
    >
      {display}
    </span>
  );
}
