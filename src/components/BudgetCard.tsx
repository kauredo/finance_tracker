"use client";

import { useState } from "react";
import { Id } from "../../convex/_generated/dataModel";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { ProgressRing } from "@/components/ui/ProgressRing";
import Icon, { IconName } from "@/components/icons/Icon";
import { Badge } from "@/components/ui/Badge";
import { useToast } from "@/contexts/ToastContext";
import { motion } from "motion/react";

interface Category {
  _id: Id<"categories">;
  name: string;
  icon?: string;
  color?: string;
}

interface Budget {
  _id: Id<"budgets">;
  categoryId: Id<"categories">;
  amount: number;
  period: "weekly" | "monthly" | "yearly";
}

interface BudgetCardProps {
  category: Category;
  budget?: Budget;
  spent: number;
  onSave: (amount: number) => Promise<void>;
  onDelete: () => Promise<void>;
  index?: number;
}

// Plant health status based on budget usage
function getBudgetHealth(percentage: number): {
  emoji: string;
  label: string;
  status: "thriving" | "growing" | "attention" | "wilting";
} {
  if (percentage <= 50)
    return { emoji: "🌿", label: "Thriving", status: "thriving" };
  if (percentage <= 80)
    return { emoji: "🌱", label: "Growing", status: "growing" };
  if (percentage <= 100)
    return { emoji: "🍂", label: "Attention", status: "attention" };
  return { emoji: "🥀", label: "Over budget", status: "wilting" };
}

export default function BudgetCard({
  category,
  budget,
  spent,
  onSave,
  onDelete,
  index = 0,
}: BudgetCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [amount, setAmount] = useState(budget?.amount?.toString() || "");
  const [isLoading, setIsLoading] = useState(false);
  const { success, error } = useToast();

  const percentage = budget ? Math.min((spent / budget.amount) * 100, 150) : 0;
  const clampedPercentage = Math.min(percentage, 100);
  const { emoji, label, status } = getBudgetHealth(percentage);

  // Color logic
  const getProgressColor = () => {
    if (status === "thriving") return "growth";
    if (status === "growing") return "primary";
    if (status === "attention") return "warning";
    return "danger";
  };

  const handleSave = async () => {
    if (!amount || isNaN(parseFloat(amount))) return;

    setIsLoading(true);
    try {
      await onSave(parseFloat(amount));
      setIsEditing(false);
      success("Budget planted successfully");
    } catch (_err) {
      error("Failed to save budget");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to remove this budget?")) return;

    setIsLoading(true);
    try {
      await onDelete();
      setAmount("");
      success("Budget removed from garden");
    } catch (_err) {
      error("Failed to remove budget");
    } finally {
      setIsLoading(false);
    }
  };

  // Edit/Create mode
  if (isEditing || !budget) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: index * 0.05 }}
      >
        <Card className="group border-2 border-dashed border-border hover:border-primary/40 transition-colors">
          <div className="flex items-center gap-3 mb-5">
            <div
              className="w-12 h-12 rounded-2xl flex items-center justify-center"
              style={{
                backgroundColor: `${category.color ?? "#888"}15`,
                color: category.color ?? "#888",
              }}
            >
              <Icon name={(category.icon ?? "other") as IconName} size={24} />
            </div>
            <div>
              <h3 className="font-display font-bold text-foreground">
                {category.name}
              </h3>
              <p className="text-xs text-text-secondary">
                {budget ? "Edit budget" : "Set a monthly limit"}
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm text-text-secondary mb-2 font-medium">
                Monthly Limit
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-text-secondary">
                  €
                </span>
                <Input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                  className="pl-10"
                />
              </div>
            </div>

            <div className="flex gap-2">
              <Button
                onClick={handleSave}
                disabled={isLoading || !amount}
                className="flex-1"
                variant="bloom"
                pill
              >
                {isLoading ? "Saving..." : budget ? "Update" : "Plant Budget"}
              </Button>
              {isEditing && (
                <Button
                  onClick={() => {
                    setIsEditing(false);
                    setAmount(budget?.amount?.toString() || "");
                  }}
                  variant="ghost"
                >
                  Cancel
                </Button>
              )}
            </div>
          </div>
        </Card>
      </motion.div>
    );
  }

  // Display mode with budget set
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
    >
      <Card
        variant={status === "wilting" ? "warm" : "default"}
        className="group relative overflow-hidden"
      >
        {/* Status indicator overlay */}
        {status === "wilting" && (
          <div className="absolute inset-0 bg-expense/5 pointer-events-none" />
        )}
        {status === "thriving" && (
          <div className="absolute inset-0 bg-growth/5 pointer-events-none" />
        )}

        {/* Action buttons */}
        <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
          <Button
            onClick={() => setIsEditing(true)}
            variant="ghost"
            size="sm"
            className="p-2 h-auto text-text-secondary hover:text-primary hover:bg-sand"
          >
            <Icon name="edit" size={16} />
          </Button>
          <Button
            onClick={handleDelete}
            variant="ghost"
            size="sm"
            className="p-2 h-auto text-text-secondary hover:text-expense hover:bg-expense/10"
          >
            <Icon name="trash" size={16} />
          </Button>
        </div>

        <div className="flex items-start gap-4 mb-5">
          {/* Progress Ring */}
          <div className="relative">
            <ProgressRing
              progress={clampedPercentage}
              size="lg"
              color={getProgressColor()}
              showPercentage={false}
            />
            <div
              className="absolute inset-0 flex items-center justify-center"
              style={{ color: category.color ?? "#888" }}
            >
              <Icon name={(category.icon ?? "other") as IconName} size={24} />
            </div>
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-display font-bold text-foreground truncate">
                {category.name}
              </h3>
              <span className="text-lg">{emoji}</span>
            </div>
            <div className="flex items-center gap-2">
              <Badge
                variant={
                  status === "thriving"
                    ? "growth"
                    : status === "growing"
                      ? "primary"
                      : status === "attention"
                        ? "warning"
                        : "danger"
                }
                size="sm"
                pill
              >
                {label}
              </Badge>
            </div>
          </div>
        </div>

        {/* Amount display */}
        <div className="mb-4">
          <div className="flex items-baseline gap-2">
            <span
              className={`text-2xl font-bold tabular-nums ${
                status === "wilting" ? "text-expense" : "text-foreground"
              }`}
            >
              €{spent.toFixed(2)}
            </span>
            <span className="text-text-secondary text-sm">
              / €{budget.amount.toFixed(2)}
            </span>
          </div>
        </div>

        {/* Progress bar */}
        <div className="h-3 bg-sand rounded-full overflow-hidden mb-3">
          <motion.div
            className={`h-full rounded-full ${
              status === "thriving"
                ? "bg-growth"
                : status === "growing"
                  ? "bg-primary"
                  : status === "attention"
                    ? "bg-warning"
                    : "bg-expense"
            }`}
            initial={{ width: 0 }}
            animate={{ width: `${clampedPercentage}%` }}
            transition={{ duration: 0.8, ease: "easeOut" }}
          />
        </div>

        {/* Footer stats */}
        <div className="flex justify-between text-sm">
          <span className="text-text-secondary">
            {clampedPercentage.toFixed(0)}% used
          </span>
          {budget.amount - spent > 0 ? (
            <span className="text-foreground font-medium tabular-nums">
              €{(budget.amount - spent).toFixed(2)} left
            </span>
          ) : (
            <span className="text-expense font-medium tabular-nums">
              €{Math.abs(budget.amount - spent).toFixed(2)} over
            </span>
          )}
        </div>
      </Card>
    </motion.div>
  );
}
