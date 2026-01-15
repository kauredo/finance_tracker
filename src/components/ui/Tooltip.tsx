"use client";

import { useState, useRef, ReactNode } from "react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "motion/react";

interface TooltipProps {
  content: ReactNode;
  children: ReactNode;
  position?: "top" | "bottom" | "left" | "right";
  variant?: "default" | "light";
  delay?: number;
  className?: string;
}

export function Tooltip({
  content,
  children,
  position = "top",
  variant = "default",
  delay = 300,
  className = "",
}: TooltipProps) {
  const [isVisible, setIsVisible] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);

  const handleMouseEnter = () => {
    timeoutRef.current = setTimeout(() => {
      setIsVisible(true);
    }, delay);
  };

  const handleMouseLeave = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    setIsVisible(false);
  };

  const positionClasses = {
    top: "bottom-full left-1/2 -translate-x-1/2 mb-2",
    bottom: "top-full left-1/2 -translate-x-1/2 mt-2",
    left: "right-full top-1/2 -translate-y-1/2 mr-2",
    right: "left-full top-1/2 -translate-y-1/2 ml-2",
  };

  const arrowPositionClasses = {
    top: "top-full left-1/2 -translate-x-1/2",
    bottom: "bottom-full left-1/2 -translate-x-1/2 rotate-180",
    left: "left-full top-1/2 -translate-y-1/2 -rotate-90",
    right: "right-full top-1/2 -translate-y-1/2 rotate-90",
  };

  const motionVariants = {
    top: { initial: { opacity: 0, y: 4 }, animate: { opacity: 1, y: 0 } },
    bottom: { initial: { opacity: 0, y: -4 }, animate: { opacity: 1, y: 0 } },
    left: { initial: { opacity: 0, x: 4 }, animate: { opacity: 1, x: 0 } },
    right: { initial: { opacity: 0, x: -4 }, animate: { opacity: 1, x: 0 } },
  };

  const variantStyles = {
    default: "bg-soil text-cream",
    light: "bg-surface text-foreground border border-border shadow-lg",
  };

  const arrowStyles = {
    default: "border-soil",
    light: "border-surface",
  };

  return (
    <div
      className={cn("relative inline-block", className)}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {children}
      <AnimatePresence>
        {isVisible && (
          <motion.div
            role="tooltip"
            initial={motionVariants[position].initial}
            animate={motionVariants[position].animate}
            exit={motionVariants[position].initial}
            transition={{ duration: 0.15, ease: "easeOut" }}
            className={cn(
              "absolute z-50 px-3 py-2 text-sm rounded-xl whitespace-nowrap",
              variantStyles[variant],
              positionClasses[position],
            )}
          >
            {content}
            <div
              className={cn(
                "absolute w-0 h-0 border-[6px] border-transparent border-t-current",
                arrowStyles[variant],
                arrowPositionClasses[position],
              )}
              style={{
                borderTopColor:
                  variant === "default" ? "var(--soil)" : "var(--surface)",
              }}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
