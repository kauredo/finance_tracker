"use client";

import { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { motion } from "motion/react";
import { Button } from "./Button";

interface EmptyStateProps {
  icon?: ReactNode;
  illustration?: "piggy" | "plant" | "search" | "chart" | "wallet";
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
    variant?: "primary" | "secondary" | "bloom";
  };
  className?: string;
}

// Simple SVG illustrations
const illustrations = {
  piggy: (
    <svg viewBox="0 0 120 120" fill="none" className="w-full h-full">
      {/* Body */}
      <ellipse cx="60" cy="65" rx="40" ry="35" className="fill-primary-light" />
      {/* Darker belly */}
      <ellipse cx="60" cy="72" rx="30" ry="22" className="fill-primary-pale" />
      {/* Snout */}
      <ellipse cx="25" cy="60" rx="12" ry="10" className="fill-primary" />
      {/* Nostrils */}
      <circle cx="22" cy="58" r="2" className="fill-primary-dark" />
      <circle cx="28" cy="58" r="2" className="fill-primary-dark" />
      {/* Eye */}
      <circle cx="40" cy="50" r="4" className="fill-soil" />
      <circle cx="41" cy="49" r="1.5" className="fill-white" />
      {/* Ear */}
      <ellipse
        cx="50"
        cy="35"
        rx="8"
        ry="12"
        className="fill-primary"
        transform="rotate(-20 50 35)"
      />
      {/* Legs */}
      <rect x="35" y="90" width="10" height="15" rx="5" className="fill-bark" />
      <rect x="55" y="90" width="10" height="15" rx="5" className="fill-bark" />
      <rect x="75" y="90" width="10" height="15" rx="5" className="fill-bark" />
      {/* Tail */}
      <path
        d="M98 60 Q108 55 105 65 Q102 75 110 70"
        className="stroke-primary"
        strokeWidth="4"
        strokeLinecap="round"
        fill="none"
      />
      {/* Coin slot */}
      <rect x="55" y="32" width="20" height="4" rx="2" className="fill-bark" />
      {/* Leaf */}
      <path d="M72 25 Q80 15 75 28 Q82 22 78 32" className="fill-growth" />
      <path
        d="M75 28 L72 35"
        className="stroke-growth-dark"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  ),
  plant: (
    <svg viewBox="0 0 120 120" fill="none" className="w-full h-full">
      {/* Pot */}
      <path d="M30 70 L35 100 L85 100 L90 70 Z" className="fill-primary" />
      <path d="M25 65 L95 65 L93 75 L27 75 Z" className="fill-primary-dark" />
      {/* Soil */}
      <ellipse cx="60" cy="72" rx="28" ry="5" className="fill-bark" />
      {/* Stem */}
      <path
        d="M60 70 Q55 50 60 35"
        className="stroke-growth-dark"
        strokeWidth="4"
        strokeLinecap="round"
        fill="none"
      />
      {/* Leaves */}
      <ellipse
        cx="45"
        cy="45"
        rx="15"
        ry="8"
        className="fill-growth"
        transform="rotate(-30 45 45)"
      />
      <ellipse
        cx="75"
        cy="50"
        rx="15"
        ry="8"
        className="fill-growth"
        transform="rotate(30 75 50)"
      />
      <ellipse
        cx="55"
        cy="30"
        rx="12"
        ry="7"
        className="fill-growth-light"
        transform="rotate(-15 55 30)"
      />
      {/* Sparkles */}
      <circle cx="30" cy="30" r="2" className="fill-primary-light" />
      <circle cx="90" cy="35" r="3" className="fill-growth-light" />
      <circle cx="20" cy="55" r="2" className="fill-warning" />
    </svg>
  ),
  search: (
    <svg viewBox="0 0 120 120" fill="none" className="w-full h-full">
      {/* Magnifying glass */}
      <circle
        cx="50"
        cy="50"
        r="30"
        className="stroke-border"
        strokeWidth="8"
        fill="none"
      />
      <circle cx="50" cy="50" r="22" className="fill-cream" />
      {/* Handle */}
      <rect
        x="72"
        y="72"
        width="12"
        height="35"
        rx="6"
        className="fill-bark"
        transform="rotate(45 72 72)"
      />
      {/* Question mark inside */}
      <text
        x="50"
        y="58"
        textAnchor="middle"
        className="fill-muted text-2xl font-display font-bold"
      >
        ?
      </text>
      {/* Sparkle */}
      <circle cx="38" cy="38" r="4" className="fill-primary-light" />
    </svg>
  ),
  chart: (
    <svg viewBox="0 0 120 120" fill="none" className="w-full h-full">
      {/* Chart background */}
      <rect
        x="15"
        y="20"
        width="90"
        height="80"
        rx="8"
        className="fill-cream stroke-border"
        strokeWidth="2"
      />
      {/* Grid lines */}
      <line
        x1="25"
        y1="45"
        x2="95"
        y2="45"
        className="stroke-border"
        strokeWidth="1"
        strokeDasharray="4"
      />
      <line
        x1="25"
        y1="65"
        x2="95"
        y2="65"
        className="stroke-border"
        strokeWidth="1"
        strokeDasharray="4"
      />
      <line
        x1="25"
        y1="85"
        x2="95"
        y2="85"
        className="stroke-border"
        strokeWidth="1"
        strokeDasharray="4"
      />
      {/* Bars */}
      <rect
        x="30"
        y="55"
        width="12"
        height="35"
        rx="4"
        className="fill-primary-light"
      />
      <rect
        x="50"
        y="40"
        width="12"
        height="50"
        rx="4"
        className="fill-growth-light"
      />
      <rect
        x="70"
        y="50"
        width="12"
        height="40"
        rx="4"
        className="fill-primary"
      />
      {/* Trend line */}
      <path
        d="M25 75 Q45 60 60 65 Q75 70 95 45"
        className="stroke-growth"
        strokeWidth="3"
        strokeLinecap="round"
        fill="none"
      />
      {/* Dot */}
      <circle cx="95" cy="45" r="4" className="fill-growth" />
    </svg>
  ),
  wallet: (
    <svg viewBox="0 0 120 120" fill="none" className="w-full h-full">
      {/* Wallet body */}
      <rect x="15" y="35" width="80" height="55" rx="8" className="fill-bark" />
      <rect x="15" y="40" width="80" height="45" rx="6" className="fill-sand" />
      {/* Wallet flap */}
      <path
        d="M15 45 Q15 30 30 30 L85 30 Q95 30 95 45 L95 50 L15 50 Z"
        className="fill-clay"
      />
      {/* Card slot */}
      <rect
        x="60"
        y="55"
        width="30"
        height="20"
        rx="3"
        className="fill-primary-pale stroke-primary-light"
        strokeWidth="2"
      />
      {/* Coins */}
      <circle
        cx="35"
        cy="65"
        r="10"
        className="fill-warning stroke-warning"
        strokeWidth="2"
      />
      <text
        x="35"
        y="69"
        textAnchor="middle"
        className="fill-soil text-xs font-bold"
      >
        $
      </text>
      {/* Money corner */}
      <rect
        x="25"
        y="75"
        width="20"
        height="4"
        rx="2"
        className="fill-growth"
      />
      <rect
        x="22"
        y="80"
        width="25"
        height="4"
        rx="2"
        className="fill-growth-light"
      />
    </svg>
  ),
};

export function EmptyState({
  icon,
  illustration = "piggy",
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.34, 1.56, 0.64, 1] }}
      className={cn(
        "flex flex-col items-center justify-center text-center py-12 px-6",
        className,
      )}
    >
      {/* Illustration or Icon */}
      <motion.div
        initial={{ scale: 0.8 }}
        animate={{ scale: 1 }}
        transition={{ duration: 0.5, delay: 0.1, ease: [0.34, 1.56, 0.64, 1] }}
        className="w-32 h-32 mb-6"
      >
        {icon || illustrations[illustration]}
      </motion.div>

      {/* Title */}
      <motion.h3
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="text-xl font-display font-bold text-foreground mb-2"
      >
        {title}
      </motion.h3>

      {/* Description */}
      {description && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="text-text-secondary max-w-sm mb-6"
        >
          {description}
        </motion.p>
      )}

      {/* Action */}
      {action && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <Button
            variant={action.variant || "primary"}
            onClick={action.onClick}
            className="min-w-[140px]"
          >
            {action.label}
          </Button>
        </motion.div>
      )}
    </motion.div>
  );
}

// Compact inline empty state
interface InlineEmptyStateProps {
  message: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
}

export function InlineEmptyState({
  message,
  action,
  className,
}: InlineEmptyStateProps) {
  return (
    <div
      className={cn(
        "flex items-center justify-center gap-4 py-8 px-4 rounded-2xl bg-sand/50 border border-dashed border-border",
        className,
      )}
    >
      <span className="text-text-secondary">{message}</span>
      {action && (
        <Button variant="ghost" size="sm" onClick={action.onClick}>
          {action.label}
        </Button>
      )}
    </div>
  );
}
