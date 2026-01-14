"use client";

import { useState, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { ProgressRing } from "@/components/ui/ProgressRing";
import { EmptyState } from "@/components/ui/EmptyState";
import Icon from "@/components/icons/Icon";
import Link from "next/link";
import { motion } from "motion/react";

interface Goal {
  id: string;
  name: string;
  target_amount: number;
  current_amount: number;
  color: string;
  icon: string;
}

// Plant growth stages based on progress
function getGrowthStage(progress: number): { emoji: string; label: string } {
  if (progress >= 100) return { emoji: "🌸", label: "Bloomed!" };
  if (progress >= 75) return { emoji: "🌿", label: "Thriving" };
  if (progress >= 50) return { emoji: "🌱", label: "Growing" };
  if (progress >= 25) return { emoji: "🌱", label: "Sprouting" };
  return { emoji: "🌰", label: "Planted" };
}

export default function GoalsWidget() {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchGoals();
  }, []);

  const fetchGoals = async () => {
    try {
      const response = await fetch("/api/goals");
      const data = await response.json();
      if (response.ok) {
        setGoals(data.goals || []);
      }
    } catch (error) {
      console.error("Error fetching goals:", error);
    } finally {
      setLoading(false);
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

  const activeGoals = goals
    .filter((g) => g.current_amount < g.target_amount)
    .slice(0, 3);

  const completedGoals = goals.filter(
    (g) => g.current_amount >= g.target_amount,
  );

  return (
    <Card className="h-full flex flex-col">
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle className="flex items-center gap-2">
            <span className="text-2xl">🌱</span>
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
              onClick: () => (window.location.href = "/goals"),
              variant: "bloom",
            }}
          />
        ) : (
          <div className="space-y-4">
            {activeGoals.map((goal, index) => {
              const progress = Math.min(
                (goal.current_amount / goal.target_amount) * 100,
                100,
              );
              const { emoji, label } = getGrowthStage(progress);
              const remaining = goal.target_amount - goal.current_amount;

              return (
                <motion.div
                  key={goal.id}
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
                        <span className="text-lg">{emoji}</span>
                        <span className="font-medium text-foreground truncate">
                          {goal.name}
                        </span>
                        <span className="text-xs text-text-secondary bg-surface px-2 py-0.5 rounded-full">
                          {label}
                        </span>
                      </div>
                      <div className="flex items-baseline gap-1 text-sm">
                        <span className="font-mono font-bold text-foreground">
                          €{goal.current_amount.toLocaleString()}
                        </span>
                        <span className="text-muted">
                          / €{goal.target_amount.toLocaleString()}
                        </span>
                      </div>
                    </div>

                    {/* Remaining */}
                    <div className="text-right hidden sm:block">
                      <p className="text-xs text-text-secondary">Remaining</p>
                      <p className="font-mono text-sm font-medium text-foreground">
                        €{remaining.toLocaleString()}
                      </p>
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
                    <span>🌸</span>
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
