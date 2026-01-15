"use client";

import { useMemo } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import { useAuth } from "@/contexts/AuthContext";
import NavBar from "@/components/NavBar";
import BudgetCard from "@/components/BudgetCard";
import { Card, MotionCard } from "@/components/ui/Card";
import { ProgressRing } from "@/components/ui/ProgressRing";
import { AmountDisplay } from "@/components/ui/AmountDisplay";
import { EmptyState } from "@/components/ui/EmptyState";
import Icon from "@/components/icons/Icon";
import Image from "next/image";
import { startOfMonth, endOfMonth, format } from "date-fns";
import { motion } from "motion/react";

// Get overall budget health
function getOverallHealth(percentage: number): {
  emoji: string;
  label: string;
  description: string;
  color: "growth" | "primary" | "warning" | "danger";
} {
  if (percentage <= 50)
    return {
      emoji: "🌿",
      label: "Thriving",
      description: "Your budget garden is flourishing!",
      color: "growth",
    };
  if (percentage <= 80)
    return {
      emoji: "🌱",
      label: "Growing",
      description: "Good progress, keep nurturing!",
      color: "primary",
    };
  if (percentage <= 100)
    return {
      emoji: "🍂",
      label: "Needs attention",
      description: "Time to tend to your spending",
      color: "warning",
    };
  return {
    emoji: "🥀",
    label: "Over budget",
    description: "Let's get back on track",
    color: "danger",
  };
}

export default function BudgetsPage() {
  const { loading: authLoading, isAuthenticated } = useAuth();

  // Get current month date range
  const dateRange = useMemo(() => {
    const now = new Date();
    return {
      from: format(startOfMonth(now), "yyyy-MM-dd"),
      to: format(endOfMonth(now), "yyyy-MM-dd"),
    };
  }, []);

  // Fetch data using Convex
  const categories = useQuery(api.categories.list);
  const budgets = useQuery(api.budgets.list);
  const budgetProgress = useQuery(api.budgets.getProgress, {
    dateFrom: dateRange.from,
    dateTo: dateRange.to,
  });

  // Mutations
  const upsertBudget = useMutation(api.budgets.upsert);
  const deleteBudget = useMutation(api.budgets.remove);

  // Calculate spending per category from budget progress
  const spending = useMemo(() => {
    const spendMap: Record<string, number> = {};
    budgetProgress?.forEach((bp) => {
      spendMap[bp.categoryId] = bp.spent;
    });
    return spendMap;
  }, [budgetProgress]);

  const handleSaveBudget = async (categoryId: Id<"categories">, amount: number) => {
    try {
      await upsertBudget({
        categoryId,
        amount,
        period: "monthly",
      });
    } catch (error) {
      console.error("Error saving budget:", error);
    }
  };

  const handleDeleteBudget = async (budgetId: Id<"budgets">) => {
    try {
      await deleteBudget({ id: budgetId });
    } catch (error) {
      console.error("Error deleting budget:", error);
    }
  };

  const loading = categories === undefined || budgets === undefined;

  if (authLoading || !isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
        >
          <Image src="/logo.png" alt="Loading" width={48} height={48} />
        </motion.div>
      </div>
    );
  }

  // Sort categories: Active budgets first, then alphabetical
  const sortedCategories = [...(categories ?? [])].sort((a, b) => {
    const hasBudgetA = (budgets ?? []).some((bg) => bg.categoryId === a._id);
    const hasBudgetB = (budgets ?? []).some((bg) => bg.categoryId === b._id);
    if (hasBudgetA && !hasBudgetB) return -1;
    if (!hasBudgetA && hasBudgetB) return 1;
    return a.name.localeCompare(b.name);
  });

  const categoriesWithBudgets = sortedCategories.filter((c) =>
    (budgets ?? []).some((b) => b.categoryId === c._id),
  );
  const categoriesWithoutBudgets = sortedCategories.filter(
    (c) => !(budgets ?? []).some((b) => b.categoryId === c._id),
  );

  const totalBudget = (budgets ?? []).reduce((sum, b) => sum + b.amount, 0);
  const totalSpent = Object.values(spending).reduce((sum, val) => sum + val, 0);
  const totalProgress = totalBudget > 0 ? (totalSpent / totalBudget) * 100 : 0;
  const remaining = totalBudget - totalSpent;

  const health = getOverallHealth(totalProgress);

  return (
    <>
      <NavBar />
      <div className="min-h-screen bg-background">
        {/* Hero Header */}
        <div className="bg-gradient-to-br from-primary-pale via-cream to-growth-pale">
          <div className="max-w-6xl mx-auto px-6 py-12">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <div className="flex items-center gap-3 mb-2">
                <motion.span
                  className="text-4xl"
                  animate={{ rotate: [0, 10, -10, 0] }}
                  transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
                >
                  🌻
                </motion.span>
                <h1 className="text-4xl font-display font-bold text-foreground">
                  Budget Garden
                </h1>
              </div>
              <p className="text-text-secondary text-lg">
                Nurture your spending habits for{" "}
                {format(new Date(), "MMMM yyyy")}
              </p>
            </motion.div>
          </div>
        </div>

        <div className="max-w-6xl mx-auto px-6 py-8">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8 -mt-16">
            {/* Total Spent */}
            <MotionCard
              variant="glass"
              transition={{ delay: 0.1 }}
              className="backdrop-blur-xl"
            >
              <div className="flex items-center gap-4">
                <ProgressRing
                  progress={Math.min(totalProgress, 100)}
                  size="lg"
                  color={health.color}
                />
                <div>
                  <p className="text-sm text-text-secondary font-medium">
                    Spent this month
                  </p>
                  <AmountDisplay
                    value={totalSpent}
                    currency="EUR"
                    size="md"
                    variant={totalSpent > totalBudget ? "expense" : "default"}
                  />
                </div>
              </div>
            </MotionCard>

            {/* Total Budget */}
            <MotionCard
              variant="glass"
              transition={{ delay: 0.2 }}
              className="backdrop-blur-xl"
            >
              <div className="flex items-center gap-4">
                <div className="p-3 bg-primary-pale rounded-2xl">
                  <Icon name="flag" size={24} className="text-primary" />
                </div>
                <div>
                  <p className="text-sm text-text-secondary font-medium">
                    Total Budget
                  </p>
                  <AmountDisplay value={totalBudget} currency="EUR" size="md" />
                </div>
              </div>
            </MotionCard>

            {/* Health Status */}
            <MotionCard
              variant="glass"
              transition={{ delay: 0.3 }}
              className="backdrop-blur-xl"
            >
              <div className="flex items-center gap-4">
                <div className="text-4xl">{health.emoji}</div>
                <div>
                  <p className="text-sm text-text-secondary font-medium">
                    Garden Status
                  </p>
                  <p className="text-lg font-display font-bold text-foreground">
                    {health.label}
                  </p>
                  <p className="text-xs text-text-secondary">
                    {remaining > 0
                      ? `€${remaining.toFixed(2)} remaining`
                      : `€${Math.abs(remaining).toFixed(2)} over budget`}
                  </p>
                </div>
              </div>
            </MotionCard>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(6)].map((_, i) => (
                <Card key={i} className="animate-pulse">
                  <div className="flex items-center gap-4 mb-4">
                    <div className="w-16 h-16 bg-sand rounded-full" />
                    <div className="flex-1">
                      <div className="h-5 w-24 bg-sand rounded mb-2" />
                      <div className="h-4 w-16 bg-sand rounded" />
                    </div>
                  </div>
                  <div className="h-3 bg-sand rounded-full mb-3" />
                  <div className="h-4 w-full bg-sand rounded" />
                </Card>
              ))}
            </div>
          ) : (budgets ?? []).length === 0 && (categories ?? []).length === 0 ? (
            <EmptyState
              illustration="chart"
              title="No categories yet"
              description="Create some spending categories first, then set budgets to track your spending."
              action={{
                label: "Go to Categories",
                onClick: () => (window.location.href = "/categories"),
              }}
            />
          ) : (
            <div className="space-y-10">
              {/* Active Budgets */}
              {categoriesWithBudgets.length > 0 && (
                <section>
                  <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="flex items-center gap-2 mb-6"
                  >
                    <span className="text-2xl">🌱</span>
                    <h2 className="text-2xl font-display font-bold text-foreground">
                      Active Budgets
                    </h2>
                    <span className="text-sm text-text-secondary bg-sand px-3 py-1 rounded-full ml-2">
                      {categoriesWithBudgets.length} planted
                    </span>
                  </motion.div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {categoriesWithBudgets.map((category, index) => {
                      const budget = (budgets ?? []).find(
                        (b) => b.categoryId === category._id,
                      );
                      const spent = spending[category._id] || 0;

                      return (
                        <BudgetCard
                          key={category._id}
                          category={category}
                          budget={budget}
                          spent={spent}
                          onSave={(amount) =>
                            handleSaveBudget(category._id, amount)
                          }
                          onDelete={() => handleDeleteBudget(budget!._id)}
                          index={index}
                        />
                      );
                    })}
                  </div>
                </section>
              )}

              {/* Categories without budgets */}
              {categoriesWithoutBudgets.length > 0 && (
                <section>
                  <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.2 }}
                    className="flex items-center gap-2 mb-6"
                  >
                    <span className="text-2xl">🌰</span>
                    <h2 className="text-2xl font-display font-bold text-foreground">
                      Ready to Plant
                    </h2>
                    <span className="text-sm text-text-secondary bg-sand px-3 py-1 rounded-full ml-2">
                      {categoriesWithoutBudgets.length} available
                    </span>
                  </motion.div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {categoriesWithoutBudgets.map((category, index) => {
                      const spent = spending[category._id] || 0;

                      return (
                        <BudgetCard
                          key={category._id}
                          category={category}
                          budget={undefined}
                          spent={spent}
                          onSave={(amount) =>
                            handleSaveBudget(category._id, amount)
                          }
                          onDelete={async () => {}}
                          index={index}
                        />
                      );
                    })}
                  </div>
                </section>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
