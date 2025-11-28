"use client";

import { useState } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import Icon, { IconName } from "@/components/icons/Icon";
import { useToast } from "@/contexts/ToastContext";

interface Category {
  id: string;
  name: string;
  icon: string;
  color: string;
}

interface Budget {
  id: string;
  category_id: string;
  amount: number;
  period: string;
}

interface BudgetCardProps {
  category: Category;
  budget?: Budget;
  spent: number;
  onSave: (amount: number) => Promise<void>;
  onDelete: () => Promise<void>;
}

export default function BudgetCard({
  category,
  budget,
  spent,
  onSave,
  onDelete,
}: BudgetCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [amount, setAmount] = useState(budget?.amount?.toString() || "");
  const [isLoading, setIsLoading] = useState(false);
  const { success, error } = useToast();

  const percentage = budget ? Math.min((spent / budget.amount) * 100, 100) : 0;
  const isOverBudget = budget ? spent > budget.amount : false;

  // Color logic
  let progressColor = "bg-success";
  if (percentage >= 80) progressColor = "bg-warning";
  if (percentage >= 100) progressColor = "bg-danger";

  const handleSave = async () => {
    if (!amount || isNaN(parseFloat(amount))) return;

    setIsLoading(true);
    try {
      await onSave(parseFloat(amount));
      setIsEditing(false);
      success("Budget saved successfully");
    } catch (err) {
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
      success("Budget removed");
    } catch (err) {
      error("Failed to remove budget");
    } finally {
      setIsLoading(false);
    }
  };

  if (isEditing || !budget) {
    return (
      <Card variant="glass" className="p-4">
        <div className="flex items-center gap-3 mb-4">
          <div
            className="w-10 h-10 rounded-lg flex items-center justify-center"
            style={{
              backgroundColor: `${category.color}20`,
              color: category.color,
            }}
          >
            <Icon name={category.icon as IconName} size={20} />
          </div>
          <h3 className="font-semibold text-foreground">{category.name}</h3>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm text-muted mb-1">
              Monthly Limit
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted">
                €
              </span>
              <Input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                className="pl-8"
              />
            </div>
          </div>

          <div className="flex gap-2">
            <Button
              onClick={handleSave}
              disabled={isLoading || !amount}
              className="flex-1"
            >
              Save
            </Button>
            {isEditing && (
              <Button
                onClick={() => setIsEditing(false)}
                variant="ghost"
                className="text-muted hover:text-foreground"
              >
                Cancel
              </Button>
            )}
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card variant="glass" className="p-4 group relative">
      <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
        <Button
          onClick={() => setIsEditing(true)}
          variant="ghost"
          size="sm"
          className="p-1.5 h-auto text-muted hover:text-primary hover:bg-surface"
          title="Edit Budget"
        >
          <Icon name="edit" size={16} />
        </Button>
        <Button
          onClick={handleDelete}
          variant="ghost"
          size="sm"
          className="p-1.5 h-auto text-muted hover:text-danger hover:bg-surface"
          title="Remove Budget"
        >
          <Icon name="trash" size={16} />
        </Button>
      </div>

      <div className="flex items-center gap-3 mb-4">
        <div
          className="w-10 h-10 rounded-lg flex items-center justify-center"
          style={{
            backgroundColor: `${category.color}20`,
            color: category.color,
          }}
        >
          <Icon name={category.icon as IconName} size={20} />
        </div>
        <div>
          <h3 className="font-semibold text-foreground">{category.name}</h3>
          <p className="text-xs text-muted">Monthly Budget</p>
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span
            className={
              isOverBudget ? "text-danger font-medium" : "text-foreground"
            }
          >
            €{spent.toFixed(2)}
          </span>
          <span className="text-muted">of €{budget.amount.toFixed(2)}</span>
        </div>

        <div className="h-2 bg-surface-alt rounded-full overflow-hidden">
          <div
            className={`h-full ${progressColor} transition-all duration-500`}
            style={{ width: `${percentage}%` }}
          />
        </div>

        <div className="text-xs text-right text-muted">
          {Math.max(0, budget.amount - spent).toFixed(2)} remaining
        </div>
      </div>
    </Card>
  );
}
