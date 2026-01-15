"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/contexts/ToastContext";
import NavBar from "@/components/NavBar";
import GoalCard from "@/components/GoalCard";
import GoalModal from "@/components/GoalModal";
import DeleteConfirmModal from "@/components/DeleteConfirmModal";
import { Card, MotionCard } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { ProgressRing } from "@/components/ui/ProgressRing";
import { EmptyState } from "@/components/ui/EmptyState";
import { AmountDisplay } from "@/components/ui/AmountDisplay";
import { Badge } from "@/components/ui/Badge";
import Icon from "@/components/icons/Icon";
import Image from "next/image";
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

export default function GoalsPage() {
  const { loading: authLoading, isAuthenticated } = useAuth();
  const { error: showError, success: showSuccess } = useToast();
  const [showModal, setShowModal] = useState(false);
  const [editingGoal, setEditingGoal] = useState<Goal | undefined>(undefined);
  const [deletingGoal, setDeletingGoal] = useState<Goal | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Fetch goals using Convex
  const goals = useQuery(api.goals.list) as Goal[] | undefined;
  const deleteGoal = useMutation(api.goals.remove);

  const loading = goals === undefined;

  const handleCreate = () => {
    setEditingGoal(undefined);
    setShowModal(true);
  };

  const handleEdit = (goal: Goal) => {
    setEditingGoal(goal);
    setShowModal(true);
  };

  const handleAddMoney = (goal: Goal) => {
    setEditingGoal(goal);
    setShowModal(true);
  };

  const handleDelete = async () => {
    if (!deletingGoal) return;

    setIsDeleting(true);
    try {
      await deleteGoal({ id: deletingGoal._id });
      showSuccess("Goal removed from your garden");
      setDeletingGoal(null);
    } catch (error) {
      console.error("Error deleting goal:", error);
      showError("Failed to delete goal");
    } finally {
      setIsDeleting(false);
    }
  };

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

  const totalSaved = (goals ?? []).reduce((sum, g) => sum + g.currentAmount, 0);
  const totalTarget = (goals ?? []).reduce((sum, g) => sum + g.targetAmount, 0);
  const overallProgress =
    totalTarget > 0 ? (totalSaved / totalTarget) * 100 : 0;

  const activeGoals = (goals ?? []).filter(
    (g) => g.currentAmount < g.targetAmount,
  );
  const completedGoals = (goals ?? []).filter(
    (g) => g.currentAmount >= g.targetAmount,
  );

  return (
    <>
      <NavBar />
      <div className="min-h-screen bg-background">
        {/* Hero Header */}
        <div className="bg-gradient-to-br from-growth-pale via-cream to-primary-pale">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10 sm:py-12">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-col md:flex-row md:items-center justify-between gap-6"
            >
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <motion.span
                    className="text-4xl"
                    animate={{ y: [0, -5, 0] }}
                    transition={{ duration: 2, repeat: Infinity }}
                  >
                    🌱
                  </motion.span>
                  <h1 className="text-4xl font-display font-bold text-foreground">
                    Dream Garden
                  </h1>
                </div>
                <p className="text-text-secondary text-lg">
                  Plant your dreams and watch them bloom into reality
                </p>
              </div>

              <Button onClick={handleCreate} variant="bloom" size="lg" pill>
                <Icon name="plus" size={20} />
                Plant a new seed
              </Button>
            </motion.div>
          </div>
        </div>

        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
          {/* Summary Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 mb-8 -mt-16">
            <MotionCard
              variant="glass"
              transition={{ delay: 0.1 }}
              className="backdrop-blur-xl"
            >
              <div className="flex items-center gap-4 h-full min-h-[64px]">
                <div className="w-12 h-12 flex items-center justify-center flex-shrink-0 bg-growth-pale rounded-2xl">
                  <Icon name="trending_up" size={24} className="text-growth" />
                </div>
                <div>
                  <p className="text-sm text-text-secondary font-medium">
                    Total Saved
                  </p>
                  <AmountDisplay
                    value={totalSaved}
                    currency="EUR"
                    variant="income"
                    size="md"
                  />
                </div>
              </div>
            </MotionCard>

            <MotionCard
              variant="glass"
              transition={{ delay: 0.2 }}
              className="backdrop-blur-xl"
            >
              <div className="flex items-center gap-4 h-full min-h-[64px]">
                <div className="w-12 h-12 flex items-center justify-center flex-shrink-0 bg-primary-pale rounded-2xl">
                  <Icon name="flag" size={24} className="text-primary" />
                </div>
                <div>
                  <p className="text-sm text-text-secondary font-medium">
                    Total Target
                  </p>
                  <AmountDisplay value={totalTarget} currency="EUR" size="md" />
                </div>
              </div>
            </MotionCard>

            <MotionCard
              variant="glass"
              transition={{ delay: 0.3 }}
              className="backdrop-blur-xl"
            >
              <div className="flex items-center gap-6 h-full min-h-[64px]">
                <div className="w-12 h-12 flex items-center justify-center flex-shrink-0">
                  <ProgressRing
                    progress={overallProgress}
                    size="md"
                    color={overallProgress >= 75 ? "growth" : "primary"}
                  />
                </div>
                <div>
                  <p className="text-sm text-text-secondary font-medium">
                    Garden Growth
                  </p>
                  <p className="text-2xl font-bold text-foreground tabular-nums">
                    {overallProgress.toFixed(0)}%
                  </p>
                </div>
              </div>
            </MotionCard>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(3)].map((_, i) => (
                <Card key={i} className="animate-pulse">
                  <div className="h-6 w-32 bg-sand rounded-lg mb-4" />
                  <div className="h-8 w-48 bg-sand rounded-lg mb-4" />
                  <div className="h-3 bg-sand rounded-full mb-4" />
                  <div className="h-10 bg-sand rounded-2xl" />
                </Card>
              ))}
            </div>
          ) : (goals ?? []).length === 0 ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
            >
              <EmptyState
                illustration="plant"
                title="Your garden awaits"
                description="Plant your first seed and watch your savings grow into something beautiful."
                action={{
                  label: "Plant your first seed",
                  onClick: handleCreate,
                  variant: "bloom",
                }}
              />
            </motion.div>
          ) : (
            <div className="space-y-8">
              {/* Active Goals */}
              {activeGoals.length > 0 && (
                <section>
                  <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="flex items-center gap-2 mb-6"
                  >
                    <span className="text-2xl">🌿</span>
                    <h2 className="text-2xl font-display font-bold text-foreground">
                      Growing
                    </h2>
                    <Badge variant="default" pill className="ml-2">
                      {activeGoals.length} goal
                      {activeGoals.length > 1 ? "s" : ""}
                    </Badge>
                  </motion.div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {activeGoals.map((goal, index) => (
                      <GoalCard
                        key={goal._id}
                        goal={goal}
                        onEdit={handleEdit}
                        onDelete={() => setDeletingGoal(goal)}
                        onAddMoney={handleAddMoney}
                        index={index}
                      />
                    ))}
                  </div>
                </section>
              )}

              {/* Completed Goals */}
              {completedGoals.length > 0 && (
                <section>
                  <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.2 }}
                    className="flex items-center gap-2 mb-6"
                  >
                    <span className="text-2xl">🌸</span>
                    <h2 className="text-2xl font-display font-bold text-foreground">
                      Bloomed
                    </h2>
                    <Badge variant="growth" pill className="ml-2">
                      {completedGoals.length} achieved!
                    </Badge>
                  </motion.div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {completedGoals.map((goal, index) => (
                      <GoalCard
                        key={goal._id}
                        goal={goal}
                        onEdit={handleEdit}
                        onDelete={() => setDeletingGoal(goal)}
                        onAddMoney={handleAddMoney}
                        index={index}
                      />
                    ))}
                  </div>
                </section>
              )}
            </div>
          )}

          {/* Floating Add Button (Mobile) */}
          <motion.div
            className="fixed bottom-6 right-6 md:hidden"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.5, type: "spring" }}
          >
            <Button
              onClick={handleCreate}
              variant="bloom"
              size="lg"
              className="w-14 h-14 rounded-full shadow-lg p-0"
            >
              <Icon name="plus" size={24} />
            </Button>
          </motion.div>

          {/* Modals */}
          {showModal && (
            <GoalModal
              goal={editingGoal}
              onClose={() => {
                setShowModal(false);
                setEditingGoal(undefined);
              }}
              onSuccess={() => {
                setShowModal(false);
                setEditingGoal(undefined);
                // Convex auto-refreshes data
              }}
            />
          )}

          {deletingGoal && (
            <DeleteConfirmModal
              title="Remove from Garden"
              message="Are you sure you want to remove this goal? All progress will be lost and cannot be recovered."
              itemName={deletingGoal.name}
              onConfirm={handleDelete}
              onCancel={() => setDeletingGoal(null)}
              isLoading={isDeleting}
            />
          )}
        </div>
      </div>
    </>
  );
}
