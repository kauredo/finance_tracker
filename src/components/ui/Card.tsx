"use client";

import { HTMLAttributes, forwardRef } from "react";
import { cn } from "@/lib/utils";
import { motion } from "motion/react";

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "interactive" | "stat" | "glass" | "growing" | "warm";
  hoverable?: boolean;
}

const Card = forwardRef<HTMLDivElement, CardProps>(
  (
    { className, variant = "default", hoverable = false, children, ...props },
    ref,
  ) => {
    const baseStyles = cn(
      "rounded-3xl p-6 transition-all duration-300",
      variant !== "glass" &&
        variant !== "growing" &&
        "bg-surface border border-border shadow-sm",
    );

    const variantStyles = {
      default: "",
      interactive: cn(
        "hover:border-primary/40 hover:shadow-lg hover:-translate-y-1 cursor-pointer",
        "hover:shadow-[0_8px_30px_rgba(255,143,171,0.12)]",
      ),
      stat: cn(
        "bg-gradient-to-br from-primary-pale via-surface to-growth-pale",
        "border-primary/20",
      ),
      glass: cn(
        "bg-surface/70 backdrop-blur-xl border border-border/40",
        "shadow-lg",
      ),
      growing: cn(
        "bg-surface border-2 border-transparent",
        "bg-clip-padding",
        "[background:linear-gradient(var(--surface),var(--surface))_padding-box,linear-gradient(135deg,var(--primary-light),var(--growth-light))_border-box]",
        "shadow-md",
      ),
      warm: cn("bg-gradient-to-br from-cream to-sand", "border-clay/50"),
    };

    const hoverStyles =
      hoverable && variant === "default"
        ? "hover:shadow-md hover:-translate-y-0.5 cursor-pointer"
        : "";

    return (
      <div
        ref={ref}
        className={cn(
          baseStyles,
          variantStyles[variant],
          hoverStyles,
          className,
        )}
        {...props}
      >
        {children}
      </div>
    );
  },
);

Card.displayName = "Card";

// Motion-enabled Card for animated appearances
interface MotionCardProps extends Omit<
  HTMLAttributes<HTMLDivElement>,
  "onAnimationStart" | "onDrag" | "onDragEnd" | "onDragStart"
> {
  variant?: "default" | "interactive" | "stat" | "glass" | "growing" | "warm";
  hoverable?: boolean;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  initial?: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  animate?: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  transition?: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  whileHover?: any;
}

const MotionCard = forwardRef<HTMLDivElement, MotionCardProps>(
  (
    {
      className,
      variant = "default",
      hoverable = false,
      children,
      initial,
      animate,
      transition,
      whileHover,
      ...props
    },
    ref,
  ) => {
    const baseStyles = cn(
      "rounded-3xl p-6",
      variant !== "glass" &&
        variant !== "growing" &&
        "bg-surface border border-border shadow-sm",
    );

    const variantStyles = {
      default: "",
      interactive: "cursor-pointer",
      stat: cn(
        "bg-gradient-to-br from-primary-pale via-surface to-growth-pale",
        "border-primary/20",
      ),
      glass: cn(
        "bg-surface/70 backdrop-blur-xl border border-border/40",
        "shadow-lg",
      ),
      growing: cn(
        "bg-surface border-2 border-transparent",
        "bg-clip-padding",
        "[background:linear-gradient(var(--surface),var(--surface))_padding-box,linear-gradient(135deg,var(--primary-light),var(--growth-light))_border-box]",
        "shadow-md",
      ),
      warm: cn("bg-gradient-to-br from-cream to-sand", "border-clay/50"),
    };

    const defaultHover =
      variant === "interactive" || hoverable
        ? {
            y: -4,
            boxShadow: "0 12px 40px rgba(255,143,171,0.15)",
            borderColor: "rgba(255,143,171,0.4)",
          }
        : undefined;

    return (
      <motion.div
        ref={ref}
        className={cn(baseStyles, variantStyles[variant], className)}
        initial={initial ?? { opacity: 0, y: 20 }}
        animate={animate ?? { opacity: 1, y: 0 }}
        transition={
          transition ?? { duration: 0.4, ease: [0.34, 1.56, 0.64, 1] }
        }
        whileHover={whileHover ?? defaultHover}
        {...props}
      >
        {children}
      </motion.div>
    );
  },
);

MotionCard.displayName = "MotionCard";

const CardHeader = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("mb-4", className)} {...props} />
  ),
);
CardHeader.displayName = "CardHeader";

const CardTitle = forwardRef<
  HTMLHeadingElement,
  HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h3
    ref={ref}
    className={cn(
      "text-xl font-bold text-foreground font-display tracking-tight",
      className,
    )}
    {...props}
  />
));
CardTitle.displayName = "CardTitle";

const CardDescription = forwardRef<
  HTMLParagraphElement,
  HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p
    ref={ref}
    className={cn("text-sm text-text-secondary mt-1", className)}
    {...props}
  />
));
CardDescription.displayName = "CardDescription";

const CardContent = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("", className)} {...props} />
  ),
);
CardContent.displayName = "CardContent";

const CardFooter = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        "mt-6 flex items-center gap-3 pt-4 border-t border-border/50",
        className,
      )}
      {...props}
    />
  ),
);
CardFooter.displayName = "CardFooter";

// Stat Card - specialized for displaying metrics
interface StatCardProps extends HTMLAttributes<HTMLDivElement> {
  label: string;
  value: string | number;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  icon?: React.ReactNode;
}

const StatCard = forwardRef<HTMLDivElement, StatCardProps>(
  ({ className, label, value, trend, icon, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        "rounded-3xl p-6 bg-surface border border-border shadow-sm",
        "transition-all duration-300 hover:shadow-md hover:-translate-y-0.5",
        className,
      )}
      {...props}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm text-text-secondary font-medium">{label}</p>
          <p className="text-3xl font-bold font-display text-foreground mt-2 tracking-tight">
            {value}
          </p>
          {trend && (
            <div
              className={cn(
                "flex items-center gap-1 mt-2 text-sm font-medium",
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
            </div>
          )}
        </div>
        {icon && (
          <div className="p-3 rounded-2xl bg-primary-pale text-primary">
            {icon}
          </div>
        )}
      </div>
    </div>
  ),
);
StatCard.displayName = "StatCard";

export {
  Card,
  MotionCard,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
  StatCard,
};
