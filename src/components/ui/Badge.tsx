"use client";

import { HTMLAttributes, forwardRef, ReactNode } from "react";
import { cn } from "@/lib/utils";
import { motion } from "motion/react";

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?:
    | "default"
    | "primary"
    | "growth"
    | "warning"
    | "danger"
    | "info"
    | "outline";
  size?: "sm" | "md" | "lg";
  pill?: boolean;
  icon?: ReactNode;
  removable?: boolean;
  onRemove?: () => void;
}

const Badge = forwardRef<HTMLSpanElement, BadgeProps>(
  (
    {
      className,
      variant = "default",
      size = "md",
      pill = false,
      icon,
      removable = false,
      onRemove,
      children,
      ...props
    },
    ref,
  ) => {
    const baseStyles = cn(
      "inline-flex items-center gap-1.5 font-medium transition-colors",
      pill ? "rounded-full" : "rounded-xl",
    );

    const variantStyles = {
      default: "bg-sand text-bark",
      primary: "bg-primary-pale text-primary-dark",
      growth: "bg-growth-pale text-growth-dark",
      warning: "bg-warning-light text-warning",
      danger: "bg-danger-light text-danger",
      info: "bg-info-light text-info",
      outline: "bg-transparent border border-border text-text-secondary",
    };

    const sizeStyles = {
      sm: "px-2 py-0.5 text-xs",
      md: "px-2.5 py-1 text-sm",
      lg: "px-3 py-1.5 text-base",
    };

    const iconSizes = {
      sm: "w-3 h-3",
      md: "w-4 h-4",
      lg: "w-5 h-5",
    };

    return (
      <span
        ref={ref}
        className={cn(
          baseStyles,
          variantStyles[variant],
          sizeStyles[size],
          className,
        )}
        {...props}
      >
        {icon && <span className={iconSizes[size]}>{icon}</span>}
        {children}
        {removable && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onRemove?.();
            }}
            className={cn(
              "ml-0.5 rounded-full hover:bg-foreground/10 transition-colors",
              size === "sm" ? "p-0.5" : "p-1",
            )}
            aria-label="Remove"
          >
            <svg
              className={iconSizes[size]}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        )}
      </span>
    );
  },
);

Badge.displayName = "Badge";

// Animated Badge variant with spring animation
interface MotionBadgeProps {
  className?: string;
  variant?:
    | "default"
    | "primary"
    | "growth"
    | "warning"
    | "danger"
    | "info"
    | "outline";
  size?: "sm" | "md" | "lg";
  pill?: boolean;
  icon?: ReactNode;
  removable?: boolean;
  onRemove?: () => void;
  children?: ReactNode;
}

const MotionBadge = forwardRef<HTMLSpanElement, MotionBadgeProps>(
  (
    {
      className,
      variant = "default",
      size = "md",
      pill = false,
      icon,
      removable = false,
      onRemove,
      children,
    },
    ref,
  ) => {
    const baseStyles = cn(
      "inline-flex items-center gap-1.5 font-medium",
      pill ? "rounded-full" : "rounded-xl",
    );

    const variantStyles = {
      default: "bg-sand text-bark",
      primary: "bg-primary-pale text-primary-dark",
      growth: "bg-growth-pale text-growth-dark",
      warning: "bg-warning-light text-warning",
      danger: "bg-danger-light text-danger",
      info: "bg-info-light text-info",
      outline: "bg-transparent border border-border text-text-secondary",
    };

    const sizeStyles = {
      sm: "px-2 py-0.5 text-xs",
      md: "px-2.5 py-1 text-sm",
      lg: "px-3 py-1.5 text-base",
    };

    const iconSizes = {
      sm: "w-3 h-3",
      md: "w-4 h-4",
      lg: "w-5 h-5",
    };

    return (
      <motion.span
        ref={ref}
        className={cn(
          baseStyles,
          variantStyles[variant],
          sizeStyles[size],
          className,
        )}
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.8, opacity: 0 }}
        transition={{ type: "spring", stiffness: 500, damping: 25 }}
      >
        {icon && <span className={iconSizes[size]}>{icon}</span>}
        {children}
        {removable && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onRemove?.();
            }}
            className={cn(
              "ml-0.5 rounded-full hover:bg-foreground/10 transition-colors",
              size === "sm" ? "p-0.5" : "p-1",
            )}
            aria-label="Remove"
          >
            <svg
              className={iconSizes[size]}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        )}
      </motion.span>
    );
  },
);

MotionBadge.displayName = "MotionBadge";

// Status Badge - specialized for showing status indicators
interface StatusBadgeProps extends Omit<BadgeProps, "variant"> {
  status: "active" | "inactive" | "pending" | "success" | "error";
  pulse?: boolean;
}

const StatusBadge = forwardRef<HTMLSpanElement, StatusBadgeProps>(
  ({ status, pulse = false, className, children, ...props }, ref) => {
    const statusConfig = {
      active: { color: "bg-growth", text: "Active", bgColor: "bg-growth-pale" },
      inactive: { color: "bg-muted", text: "Inactive", bgColor: "bg-sand" },
      pending: {
        color: "bg-warning",
        text: "Pending",
        bgColor: "bg-warning-light",
      },
      success: {
        color: "bg-growth",
        text: "Success",
        bgColor: "bg-growth-pale",
      },
      error: { color: "bg-danger", text: "Error", bgColor: "bg-danger-light" },
    };

    const config = statusConfig[status];

    return (
      <span
        ref={ref}
        className={cn(
          "inline-flex items-center gap-2 px-2.5 py-1 rounded-full text-sm font-medium",
          config.bgColor,
          className,
        )}
        {...props}
      >
        <span className="relative flex h-2 w-2">
          {pulse && (
            <span
              className={cn(
                "animate-ping absolute inline-flex h-full w-full rounded-full opacity-75",
                config.color,
              )}
            />
          )}
          <span
            className={cn(
              "relative inline-flex rounded-full h-2 w-2",
              config.color,
            )}
          />
        </span>
        <span className="text-foreground">{children || config.text}</span>
      </span>
    );
  },
);

StatusBadge.displayName = "StatusBadge";

// Count Badge - for notification counts
interface CountBadgeProps {
  count: number;
  max?: number;
  variant?: "primary" | "danger" | "growth";
  size?: "sm" | "md";
  className?: string;
}

function CountBadge({
  count,
  max = 99,
  variant = "primary",
  size = "sm",
  className,
}: CountBadgeProps) {
  const displayCount = count > max ? `${max}+` : count;

  const variantStyles = {
    primary: "bg-primary text-white",
    danger: "bg-danger text-white",
    growth: "bg-growth text-white",
  };

  const sizeStyles = {
    sm: "min-w-[18px] h-[18px] text-xs px-1",
    md: "min-w-[22px] h-[22px] text-sm px-1.5",
  };

  if (count <= 0) return null;

  return (
    <motion.span
      initial={{ scale: 0 }}
      animate={{ scale: 1 }}
      className={cn(
        "inline-flex items-center justify-center font-bold rounded-full tabular-nums",
        variantStyles[variant],
        sizeStyles[size],
        className,
      )}
    >
      {displayCount}
    </motion.span>
  );
}

export { Badge, MotionBadge, StatusBadge, CountBadge };
