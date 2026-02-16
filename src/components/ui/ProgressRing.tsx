"use client";

import { cn } from "@/lib/utils";
import { motion } from "motion/react";

interface ProgressRingProps {
  progress: number; // 0-100
  size?: "sm" | "md" | "lg" | "xl";
  strokeWidth?: number;
  color?: "primary" | "growth" | "warning" | "danger";
  showPercentage?: boolean;
  label?: string;
  className?: string;
  animated?: boolean;
}

const sizeMap = {
  sm: 48,
  md: 80,
  lg: 120,
  xl: 160,
};

const strokeWidthMap = {
  sm: 4,
  md: 6,
  lg: 8,
  xl: 10,
};

const colorMap = {
  primary: {
    stroke: "stroke-primary",
    text: "text-primary",
    glow: "drop-shadow-[0_0_8px_rgba(255,143,171,0.5)]",
  },
  growth: {
    stroke: "stroke-growth",
    text: "text-growth",
    glow: "drop-shadow-[0_0_8px_rgba(124,180,130,0.5)]",
  },
  warning: {
    stroke: "stroke-warning",
    text: "text-warning",
    glow: "drop-shadow-[0_0_8px_rgba(255,183,77,0.5)]",
  },
  danger: {
    stroke: "stroke-danger",
    text: "text-danger",
    glow: "drop-shadow-[0_0_8px_rgba(229,115,115,0.5)]",
  },
};

export function ProgressRing({
  progress,
  size = "md",
  strokeWidth,
  color = "primary",
  showPercentage = true,
  label,
  className,
  animated = true,
}: ProgressRingProps) {
  const dimension = sizeMap[size];
  const stroke = strokeWidth || strokeWidthMap[size];
  const radius = (dimension - stroke) / 2;
  const circumference = radius * 2 * Math.PI;
  const clampedProgress = Math.min(100, Math.max(0, progress));
  const offset = circumference - (clampedProgress / 100) * circumference;
  const colors = colorMap[color];

  const fontSizes = {
    sm: "text-xs",
    md: "text-lg",
    lg: "text-2xl",
    xl: "text-3xl",
  };

  const labelSizes = {
    sm: "text-[10px]",
    md: "text-xs",
    lg: "text-sm",
    xl: "text-base",
  };

  return (
    <div
      className={cn(
        "relative inline-flex items-center justify-center",
        className,
      )}
      role="progressbar"
      aria-valuenow={Math.round(clampedProgress)}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={label || `${Math.round(clampedProgress)}%`}
    >
      <svg
        width={dimension}
        height={dimension}
        className="transform -rotate-90"
      >
        {/* Background circle */}
        <circle
          cx={dimension / 2}
          cy={dimension / 2}
          r={radius}
          fill="none"
          className="stroke-border"
          strokeWidth={stroke}
        />
        {/* Progress circle */}
        {animated ? (
          <motion.circle
            cx={dimension / 2}
            cy={dimension / 2}
            r={radius}
            fill="none"
            className={cn(colors.stroke, colors.glow)}
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={circumference}
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset: offset }}
            transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
          />
        ) : (
          <circle
            cx={dimension / 2}
            cy={dimension / 2}
            r={radius}
            fill="none"
            className={cn(colors.stroke, colors.glow)}
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
          />
        )}
      </svg>
      {/* Center content */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        {showPercentage && (
          <span
            className={cn(
              "font-display font-bold",
              fontSizes[size],
              colors.text,
            )}
          >
            {Math.round(clampedProgress)}%
          </span>
        )}
        {label && (
          <span className={cn("text-text-secondary mt-0.5", labelSizes[size])}>
            {label}
          </span>
        )}
      </div>
    </div>
  );
}

// Multi-ring variant for comparing multiple values
interface MultiProgressRingProps {
  rings: Array<{
    progress: number;
    color: "primary" | "growth" | "warning" | "danger";
    label?: string;
  }>;
  size?: "md" | "lg" | "xl";
  className?: string;
}

export function MultiProgressRing({
  rings,
  size = "lg",
  className,
}: MultiProgressRingProps) {
  const dimension = sizeMap[size];
  const baseStroke = strokeWidthMap[size];
  const gap = 4;

  return (
    <div
      className={cn(
        "relative inline-flex items-center justify-center",
        className,
      )}
    >
      <svg
        width={dimension}
        height={dimension}
        className="transform -rotate-90"
      >
        {rings.map((ring, index) => {
          const stroke = baseStroke;
          const offset = (baseStroke + gap) * index;
          const radius = (dimension - stroke) / 2 - offset;
          const circumference = radius * 2 * Math.PI;
          const clampedProgress = Math.min(100, Math.max(0, ring.progress));
          const dashOffset =
            circumference - (clampedProgress / 100) * circumference;
          const colors = colorMap[ring.color];

          return (
            <g key={index}>
              {/* Background */}
              <circle
                cx={dimension / 2}
                cy={dimension / 2}
                r={radius}
                fill="none"
                className="stroke-border"
                strokeWidth={stroke}
                opacity={0.3}
              />
              {/* Progress */}
              <motion.circle
                cx={dimension / 2}
                cy={dimension / 2}
                r={radius}
                fill="none"
                className={cn(colors.stroke)}
                strokeWidth={stroke}
                strokeLinecap="round"
                strokeDasharray={circumference}
                initial={{ strokeDashoffset: circumference }}
                animate={{ strokeDashoffset: dashOffset }}
                transition={{
                  duration: 1,
                  ease: [0.16, 1, 0.3, 1],
                  delay: index * 0.1,
                }}
              />
            </g>
          );
        })}
      </svg>
    </div>
  );
}

// Semicircle/Gauge variant
interface GaugeProps {
  value: number; // 0-100
  size?: "md" | "lg" | "xl";
  color?: "primary" | "growth" | "warning" | "danger";
  label?: string;
  valueLabel?: string;
  className?: string;
}

export function Gauge({
  value,
  size = "lg",
  color = "primary",
  label,
  valueLabel,
  className,
}: GaugeProps) {
  const dimension = sizeMap[size];
  const stroke = strokeWidthMap[size];
  const radius = (dimension - stroke) / 2;
  const circumference = radius * Math.PI; // Half circle
  const clampedValue = Math.min(100, Math.max(0, value));
  const offset = circumference - (clampedValue / 100) * circumference;
  const colors = colorMap[color];

  const fontSizes = {
    md: "text-2xl",
    lg: "text-3xl",
    xl: "text-4xl",
  };

  return (
    <div
      className={cn("relative inline-flex flex-col items-center", className)}
    >
      <svg
        width={dimension}
        height={dimension / 2 + stroke}
        className="overflow-visible"
      >
        {/* Background arc */}
        <path
          d={`M ${stroke / 2} ${dimension / 2} A ${radius} ${radius} 0 0 1 ${dimension - stroke / 2} ${dimension / 2}`}
          fill="none"
          className="stroke-border"
          strokeWidth={stroke}
          strokeLinecap="round"
        />
        {/* Progress arc */}
        <motion.path
          d={`M ${stroke / 2} ${dimension / 2} A ${radius} ${radius} 0 0 1 ${dimension - stroke / 2} ${dimension / 2}`}
          fill="none"
          className={cn(colors.stroke, colors.glow)}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
        />
      </svg>
      {/* Value display */}
      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 text-center">
        <span
          className={cn("font-display font-bold", fontSizes[size], colors.text)}
        >
          {valueLabel || `${Math.round(clampedValue)}%`}
        </span>
        {label && <p className="text-sm text-text-secondary mt-1">{label}</p>}
      </div>
    </div>
  );
}
