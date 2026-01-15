"use client";

import { Id } from "../../convex/_generated/dataModel";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { ProgressRing } from "@/components/ui/ProgressRing";
import Icon, { IconName } from "@/components/icons/Icon";
import { format, formatDistanceToNow } from "date-fns";
import { motion } from "motion/react";

interface Goal {
  _id: Id<"goals">;
  name: string;
  targetAmount: number;
  currentAmount: number;
  targetDate?: string;
  color?: string;
  icon?: string;
}

interface GoalCardProps {
  goal: Goal;
  onEdit: (goal: Goal) => void;
  onDelete: (goal: Goal) => void;
  onAddMoney: (goal: Goal) => void;
  index?: number;
}

// Plant growth stages based on progress
function getGrowthStage(progress: number): {
  emoji: string;
  label: string;
  description: string;
} {
  if (progress >= 100)
    return { emoji: "🌸", label: "Bloomed!", description: "Goal achieved!" };
  if (progress >= 75)
    return {
      emoji: "🌿",
      label: "Thriving",
      description: "Almost there, keep going!",
    };
  if (progress >= 50)
    return {
      emoji: "🌱",
      label: "Growing",
      description: "Great progress so far!",
    };
  if (progress >= 25)
    return {
      emoji: "🌱",
      label: "Sprouting",
      description: "Your goal is taking root!",
    };
  return {
    emoji: "🌰",
    label: "Planted",
    description: "Just getting started!",
  };
}

export default function GoalCard({
  goal,
  onEdit,
  onDelete,
  onAddMoney,
  index = 0,
}: GoalCardProps) {
  const progress = Math.min(
    (goal.currentAmount / goal.targetAmount) * 100,
    100,
  );
  const remaining = Math.max(goal.targetAmount - goal.currentAmount, 0);
  const { emoji, label, description } = getGrowthStage(progress);
  const isComplete = progress >= 100;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1, duration: 0.4 }}
    >
      <Card
        variant={isComplete ? "growing" : "default"}
        className="group hover:shadow-lg transition-all relative overflow-hidden"
      >
        {/* Completion celebration overlay */}
        {isComplete && (
          <div className="absolute inset-0 bg-gradient-to-br from-growth-pale/50 to-transparent pointer-events-none" />
        )}

        <div className="relative">
          {/* Header */}
          <div className="flex justify-between items-start mb-4">
            <div className="flex items-center gap-3">
              {/* Progress Ring with Icon */}
              <div className="relative">
                <ProgressRing
                  progress={progress}
                  size="md"
                  color={isComplete ? "growth" : "primary"}
                  showPercentage={false}
                />
                <div
                  className="absolute inset-0 flex items-center justify-center"
                  style={{ color: goal.color ?? "#10b981" }}
                >
                  <Icon name={(goal.icon ?? "savings") as IconName} size={20} />
                </div>
              </div>

              <div>
                <div className="flex items-center gap-2 mb-0.5">
                  <h3 className="font-bold text-foreground text-lg font-display">
                    {goal.name}
                  </h3>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-lg">{emoji}</span>
                  <span className="text-xs text-text-secondary bg-sand px-2 py-0.5 rounded-full font-medium">
                    {label}
                  </span>
                </div>
              </div>
            </div>

            {/* Menu */}
            <div className="relative group/menu">
              <Button
                variant="ghost"
                size="sm"
                className="p-2 h-auto text-muted hover:text-foreground"
              >
                <Icon name="other" size={20} />
              </Button>
              <div className="absolute right-0 mt-1 w-36 bg-surface border border-border rounded-2xl shadow-xl opacity-0 invisible group-hover/menu:opacity-100 group-hover/menu:visible transition-all z-10 overflow-hidden">
                <button
                  onClick={() => onEdit(goal)}
                  className="w-full text-left px-4 py-2.5 text-sm text-foreground hover:bg-sand transition-colors flex items-center gap-2"
                >
                  <Icon name="edit" size={16} />
                  Edit Goal
                </button>
                <button
                  onClick={() => onDelete(goal)}
                  className="w-full text-left px-4 py-2.5 text-sm text-expense hover:bg-expense/10 transition-colors flex items-center gap-2"
                >
                  <Icon name="trash" size={16} />
                  Delete
                </button>
              </div>
            </div>
          </div>

          {/* Amount Display */}
          <div className="mb-4">
            <div className="flex items-baseline gap-2 mb-3">
              <span className="text-3xl font-bold text-foreground font-mono">
                €{goal.currentAmount.toLocaleString()}
              </span>
              <span className="text-sm text-text-secondary">
                / €{goal.targetAmount.toLocaleString()}
              </span>
            </div>

            {/* Progress Bar */}
            <div className="h-3 bg-sand rounded-full overflow-hidden">
              <motion.div
                className="h-full rounded-full"
                style={{
                  backgroundColor: isComplete
                    ? "var(--growth)"
                    : goal.color ?? "var(--primary)",
                }}
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 1, delay: 0.2, ease: "easeOut" }}
              />
            </div>

            {/* Stats Row */}
            <div className="flex justify-between mt-3 text-sm">
              <span className="text-text-secondary">
                {progress.toFixed(0)}% complete
              </span>
              {remaining > 0 ? (
                <span className="text-foreground font-medium">
                  €{remaining.toLocaleString()} to go
                </span>
              ) : (
                <span className="text-growth font-medium flex items-center gap-1">
                  <Icon name="check" size={14} />
                  Complete!
                </span>
              )}
            </div>
          </div>

          {/* Target Date */}
          {goal.targetDate && (
            <div className="mb-4 p-3 bg-sand/50 rounded-xl">
              <div className="flex items-center gap-2 text-sm">
                <Icon
                  name="calendar"
                  size={16}
                  className="text-text-secondary"
                />
                <span className="text-text-secondary">Target:</span>
                <span className="text-foreground font-medium">
                  {format(new Date(goal.targetDate), "MMM d, yyyy")}
                </span>
                <span className="text-text-secondary">
                  (
                  {formatDistanceToNow(new Date(goal.targetDate), {
                    addSuffix: true,
                  })}
                  )
                </span>
              </div>
            </div>
          )}

          {/* Action Button */}
          {!isComplete ? (
            <Button
              onClick={() => onAddMoney(goal)}
              variant="bloom"
              className="w-full"
              pill
            >
              <Icon name="plus" size={18} />
              Water this goal
            </Button>
          ) : (
            <div className="text-center py-3 bg-growth-pale rounded-2xl">
              <p className="text-growth font-medium flex items-center justify-center gap-2">
                <span className="text-xl">🎉</span>
                {description}
                <span className="text-xl">🎉</span>
              </p>
            </div>
          )}
        </div>
      </Card>
    </motion.div>
  );
}
