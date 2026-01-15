"use client";

import { useQuery } from "convex/react";
import { useRouter } from "next/navigation";
import { api } from "../../../convex/_generated/api";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { ProgressRing } from "@/components/ui/ProgressRing";
import { EmptyState } from "@/components/ui/EmptyState";
import Link from "next/link";
import { motion } from "motion/react";

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

  // Fetch goals using Convex - automatically reactive
  const goals = useQuery(api.goals.list);

  const loading = goals === undefined;

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
                        <span className="text-lg">{emoji}</span>
                        <span className="font-medium text-foreground truncate">
                          {goal.name}
                        </span>
                        <span className="text-xs text-text-secondary bg-surface px-2 py-0.5 rounded-full">
                          {label}
                        </span>
                      </div>
                      <div className="flex items-baseline gap-1 text-sm">
                        <span className="font-bold text-foreground tabular-nums">
                          €{goal.currentAmount.toLocaleString()}
                        </span>
                        <span className="text-muted">
                          / €{goal.targetAmount.toLocaleString()}
                        </span>
                      </div>
                    </div>

                    {/* Remaining */}
                    <div className="text-right hidden sm:block">
                      <p className="text-xs text-text-secondary">Remaining</p>
                      <p className="text-sm font-medium text-foreground tabular-nums">
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
