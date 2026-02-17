"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { useRouter } from "next/navigation";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { ProgressRing } from "@/components/ui/ProgressRing";
import { EmptyState } from "@/components/ui/EmptyState";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/contexts/ToastContext";
import Link from "next/link";
import { useCurrency } from "@/hooks/useCurrency";
import { motion, AnimatePresence } from "motion/react";
import { Input } from "@/components/ui/Input";

// Plant growth stages based on progress
function getGrowthStage(progress: number): { emoji: string; label: string } {
  if (progress >= 100) return { emoji: "🌸", label: "Bloomed!" };
  if (progress >= 75) return { emoji: "🌿", label: "Thriving" };
  if (progress >= 50) return { emoji: "🌱", label: "Growing" };
  if (progress >= 25) return { emoji: "🌱", label: "Sprouting" };
  return { emoji: "🌰", label: "Planted" };
}

export default function GoalsWidget() {
  const router = useRouter();
  const toast = useToast();
  const addFunds = useMutation(api.goals.addFunds);
  const [addingTo, setAddingTo] = useState<Id<"goals"> | null>(null);
  const [wateringGoal, setWateringGoal] = useState<Id<"goals"> | null>(null);
  const [waterAmount, setWaterAmount] = useState("");

  // Fetch goals using Convex - automatically reactive
  const goals = useQuery(api.goals.list);

  const loading = goals === undefined;
  const { formatAmount } = useCurrency();

  const handleQuickAdd = async (goalId: Id<"goals">, amount: number) => {
    setAddingTo(goalId);
    try {
      await addFunds({ id: goalId, amount });
      toast.success(`Added ${formatAmount(amount)}!`);
    } catch {
      toast.error("Failed to add funds");
    } finally {
      setAddingTo(null);
    }
  };

  if (loading)
    return (
      <Card className="h-full">
        <div className="animate-pulse p-6">
          <div className="h-6 w-32 bg-sand rounded-lg mb-6" />
          <div className="space-y-4">
            <div className="h-16 bg-sand rounded-2xl" />
            <div className="h-16 bg-sand rounded-2xl" />
          </div>
        </div>
      </Card>
    );

  const activeGoals = (goals ?? [])
    .filter((g) => g.currentAmount < g.targetAmount)
    .slice(0, 3);

  const completedGoals = (goals ?? []).filter(
    (g) => g.currentAmount >= g.targetAmount,
  );

  return (
    <Card className="h-full flex flex-col">
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle className="flex items-center gap-2">
            <span className="text-2xl" aria-hidden="true">
              🌱
            </span>
            Dream Garden
          </CardTitle>
          <Link href="/goals" className="text-sm text-primary hover:underline">
            View All
          </Link>
        </div>
      </CardHeader>

      <CardContent className="flex-1">
        {activeGoals.length === 0 && completedGoals.length === 0 ? (
          <EmptyState
            illustration="plant"
            title="Plant your first seed"
            description="Set a savings goal and watch it grow!"
            action={{
              label: "Create Goal",
              onClick: () => router.push("/goals"),
              variant: "bloom",
            }}
          />
        ) : (
          <div className="space-y-4">
            {activeGoals.map((goal, index) => {
              const progress = Math.min(
                (goal.currentAmount / goal.targetAmount) * 100,
                100,
              );
              const { emoji, label } = getGrowthStage(progress);
              const remaining = goal.targetAmount - goal.currentAmount;

              return (
                <motion.div
                  key={goal._id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="group p-4 rounded-2xl bg-sand/50 hover:bg-sand transition-colors"
                >
                  <div className="flex items-center gap-4">
                    {/* Progress Ring */}
                    <ProgressRing
                      progress={progress}
                      size="sm"
                      color={progress >= 75 ? "growth" : "primary"}
                      showPercentage={false}
                    />

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-lg" aria-hidden="true">
                          {emoji}
                        </span>
                        <span className="font-medium text-foreground truncate">
                          {goal.name}
                        </span>
                        <span className="text-xs text-text-secondary bg-surface px-2 py-0.5 rounded-full">
                          {label}
                        </span>
                      </div>
                      <div className="flex items-baseline gap-1 text-sm">
                        <span className="font-bold text-foreground tabular-nums">
                          {formatAmount(goal.currentAmount, 0)}
                        </span>
                        <span className="text-muted">
                          / {formatAmount(goal.targetAmount, 0)}
                        </span>
                      </div>
                    </div>

                    {/* Water this goal */}
                    <div className="flex flex-col items-end gap-1">
                      <AnimatePresence mode="wait">
                        {wateringGoal === goal._id ? (
                          <motion.form
                            key="input"
                            initial={{ opacity: 0, width: 0 }}
                            animate={{ opacity: 1, width: "auto" }}
                            exit={{ opacity: 0, width: 0 }}
                            onSubmit={(e) => {
                              e.preventDefault();
                              const amt = parseFloat(waterAmount);
                              if (amt > 0) {
                                handleQuickAdd(goal._id, amt);
                                setWateringGoal(null);
                                setWaterAmount("");
                              }
                            }}
                            className="flex items-center gap-1"
                          >
                            <Input
                              type="number"
                              value={waterAmount}
                              onChange={(e) => setWaterAmount(e.target.value)}
                              placeholder="0"
                              min="1"
                              step="any"
                              autoFocus
                              className="w-20 text-sm h-9 text-right"
                              onBlur={() => {
                                if (!waterAmount) {
                                  setWateringGoal(null);
                                }
                              }}
                            />
                            <Button
                              type="submit"
                              variant="bloom"
                              size="sm"
                              disabled={
                                !waterAmount ||
                                parseFloat(waterAmount) <= 0 ||
                                addingTo === goal._id
                              }
                              isLoading={addingTo === goal._id}
                              className="h-9 px-3"
                            >
                              💧
                            </Button>
                          </motion.form>
                        ) : (
                          <motion.div
                            key="button"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                          >
                            <p className="text-xs text-text-secondary text-right mb-1 hidden sm:block">
                              {formatAmount(remaining, 0)} left
                            </p>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                setWateringGoal(goal._id);
                                setWaterAmount("");
                              }}
                              disabled={addingTo === goal._id}
                              isLoading={addingTo === goal._id}
                              className="text-xs h-9 px-3"
                            >
                              💧 Water
                            </Button>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </div>
                </motion.div>
              );
            })}

            {/* Completed goals preview */}
            {completedGoals.length > 0 && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
                className="pt-4 border-t border-border"
              >
                <div className="flex items-center justify-between text-sm">
                  <span className="text-text-secondary flex items-center gap-2">
                    <span aria-hidden="true">🌸</span>
                    {completedGoals.length} goal
                    {completedGoals.length > 1 ? "s" : ""} bloomed!
                  </span>
                  <Link
                    href="/goals"
                    className="text-growth hover:underline font-medium"
                  >
                    Celebrate
                  </Link>
                </div>
              </motion.div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
