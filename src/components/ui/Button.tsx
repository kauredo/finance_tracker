"use client";

import { ButtonHTMLAttributes, forwardRef } from "react";
import { cn } from "@/lib/utils";
import { motion, HTMLMotionProps } from "motion/react";

export interface ButtonProps extends Omit<
  ButtonHTMLAttributes<HTMLButtonElement>,
  "onAnimationStart" | "onDrag" | "onDragEnd" | "onDragStart"
> {
  variant?: "primary" | "secondary" | "ghost" | "danger" | "bloom" | "soft";
  size?: "sm" | "md" | "lg";
  isLoading?: boolean;
  pill?: boolean;
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = "primary",
      size = "md",
      isLoading,
      pill = false,
      children,
      disabled,
      ...props
    },
    ref,
  ) => {
    const baseStyles = cn(
      "inline-flex items-center justify-center gap-2 font-medium transition-all duration-200",
      "focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-primary/50",
      "disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none",
      pill ? "rounded-full" : "rounded-2xl",
    );

    const variantStyles = {
      primary: cn(
        "bg-primary text-white shadow-sm",
        "hover:bg-primary-dark hover:shadow-md hover:-translate-y-0.5",
        "active:translate-y-0 active:shadow-sm",
        "hover:shadow-[0_4px_14px_rgba(255,143,171,0.4)]",
      ),
      secondary: cn(
        "bg-surface border-2 border-border text-foreground shadow-sm",
        "hover:border-primary/40 hover:bg-primary-pale hover:shadow-md hover:-translate-y-0.5",
        "active:translate-y-0 active:shadow-sm",
      ),
      ghost: cn(
        "text-foreground",
        "hover:bg-sand hover:text-primary",
        "active:bg-clay",
      ),
      danger: cn(
        "bg-danger text-white shadow-sm",
        "hover:bg-danger/90 hover:shadow-md hover:-translate-y-0.5",
        "hover:shadow-[0_4px_14px_rgba(229,115,115,0.4)]",
        "active:translate-y-0 active:shadow-sm",
      ),
      bloom: cn(
        "bg-growth text-white shadow-sm",
        "hover:bg-growth-dark hover:shadow-md hover:-translate-y-0.5",
        "hover:shadow-[0_4px_14px_rgba(124,180,130,0.4)]",
        "active:translate-y-0 active:shadow-sm",
      ),
      soft: cn(
        "bg-surface/80 backdrop-blur-sm border border-border/50 text-foreground",
        "hover:bg-surface hover:border-border hover:shadow-md hover:-translate-y-0.5",
        "active:translate-y-0 active:shadow-sm",
      ),
    };

    const sizeStyles = {
      sm: "px-4 py-2 text-sm",
      md: "px-5 py-2.5 text-base",
      lg: "px-7 py-3.5 text-lg",
    };

    const spinnerSizes = {
      sm: "h-3.5 w-3.5",
      md: "h-4 w-4",
      lg: "h-5 w-5",
    };

    return (
      <button
        ref={ref}
        className={cn(
          baseStyles,
          variantStyles[variant],
          sizeStyles[size],
          className,
        )}
        disabled={disabled || isLoading}
        {...props}
      >
        {isLoading && (
          <svg
            className={cn("animate-spin", spinnerSizes[size])}
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
        )}
        {children}
      </button>
    );
  },
);

Button.displayName = "Button";

// Animated Button variant using motion
const MotionButton = forwardRef<
  HTMLButtonElement,
  ButtonProps & Omit<HTMLMotionProps<"button">, keyof ButtonProps>
>(
  (
    {
      className,
      variant = "primary",
      size = "md",
      isLoading,
      pill = false,
      children,
      disabled,
      ...props
    },
    ref,
  ) => {
    const baseStyles = cn(
      "inline-flex items-center justify-center gap-2 font-medium",
      "focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-primary/50",
      "disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none",
      pill ? "rounded-full" : "rounded-2xl",
    );

    const variantStyles = {
      primary: "bg-primary text-white shadow-sm",
      secondary: "bg-surface border-2 border-border text-foreground shadow-sm",
      ghost: "text-foreground hover:bg-sand",
      danger: "bg-danger text-white shadow-sm",
      bloom: "bg-growth text-white shadow-sm",
      soft: "bg-surface/80 backdrop-blur-sm border border-border/50 text-foreground",
    };

    const sizeStyles = {
      sm: "px-4 py-2 text-sm",
      md: "px-5 py-2.5 text-base",
      lg: "px-7 py-3.5 text-lg",
    };

    const spinnerSizes = {
      sm: "h-3.5 w-3.5",
      md: "h-4 w-4",
      lg: "h-5 w-5",
    };

    return (
      <motion.button
        ref={ref}
        className={cn(
          baseStyles,
          variantStyles[variant],
          sizeStyles[size],
          className,
        )}
        disabled={disabled || isLoading}
        whileHover={{
          scale: 1.02,
          y: -2,
          boxShadow:
            variant === "primary"
              ? "0 8px 20px rgba(255,143,171,0.35)"
              : variant === "bloom"
                ? "0 8px 20px rgba(124,180,130,0.35)"
                : "0 8px 20px rgba(93,74,61,0.15)",
        }}
        whileTap={{ scale: 0.98, y: 0 }}
        transition={{ type: "spring", stiffness: 400, damping: 17 }}
        {...props}
      >
        {isLoading && (
          <motion.svg
            className={spinnerSizes[size]}
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </motion.svg>
        )}
        {children}
      </motion.button>
    );
  },
);

MotionButton.displayName = "MotionButton";

export { Button, MotionButton };
