"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/contexts/ToastContext";
import NavBar from "@/components/NavBar";
import GoalCard from "@/components/GoalCard";
import GoalModal from "@/components/GoalModal";
import DeleteConfirmModal from "@/components/DeleteConfirmModal";

interface Goal {
  id: string;
  name: string;
  target_amount: number;
  current_amount: number;
  target_date: string | null;
  color: string;
  icon: string;
}

export default function GoalsPage() {
  const { user, loading: authLoading } = useAuth();
  const { error: showError, success: showSuccess } = useToast();
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingGoal, setEditingGoal] = useState<Goal | undefined>(undefined);
  const [deletingGoal, setDeletingGoal] = useState<Goal | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    if (user) {
      fetchGoals();
    }
  }, [user]);

  const fetchGoals = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/goals");
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to fetch goals");
      }

      setGoals(data.goals || []);
    } catch (error) {
      console.error("Error fetching goals:", error);
      showError("Failed to load goals");
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    setEditingGoal(undefined);
    setShowModal(true);
  };

  const handleEdit = (goal: Goal) => {
    setEditingGoal(goal);
    setShowModal(true);
  };

  const handleAddMoney = (goal: Goal) => {
    // For now, re-use edit modal but maybe pre-focus amount?
    // Or just open edit modal is fine for MVP
    setEditingGoal(goal);
    setShowModal(true);
  };

  const handleDelete = async () => {
    if (!deletingGoal) return;

    setIsDeleting(true);
    try {
      const response = await fetch(`/api/goals/${deletingGoal.id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to delete goal");
      }

      showSuccess("Goal deleted successfully");
      fetchGoals();
      setDeletingGoal(null);
    } catch (error) {
      console.error("Error deleting goal:", error);
      showError("Failed to delete goal");
    } finally {
      setIsDeleting(false);
    }
  };

  if (authLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-muted">Loading...</div>
      </div>
    );
  }

  const totalSaved = goals.reduce((sum, g) => sum + g.current_amount, 0);
  const totalTarget = goals.reduce((sum, g) => sum + g.target_amount, 0);

  return (
    <>
      <NavBar />
      <div className="min-h-screen bg-background p-6">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
            <div>
              <h1 className="text-4xl font-bold text-foreground mb-2">
                Savings Goals
              </h1>
              <p className="text-muted">
                Track your progress towards financial targets
              </p>
            </div>
            <button
              onClick={handleCreate}
              className="px-6 py-3 bg-primary text-white font-bold rounded-lg hover:bg-primary/90 transition-all shadow-lg hover:shadow-xl flex items-center justify-center gap-2"
            >
              <span className="text-xl">+</span>
              New Goal
            </button>
          </div>

          {/* Summary Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-surface border border-border rounded-xl p-6">
              <h3 className="text-muted text-sm font-medium mb-2">
                Total Saved
              </h3>
              <p className="text-3xl font-bold text-success">
                €{totalSaved.toLocaleString()}
              </p>
            </div>
            <div className="bg-surface border border-border rounded-xl p-6">
              <h3 className="text-muted text-sm font-medium mb-2">
                Total Target
              </h3>
              <p className="text-3xl font-bold text-foreground">
                €{totalTarget.toLocaleString()}
              </p>
            </div>
            <div className="bg-surface border border-border rounded-xl p-6">
              <h3 className="text-muted text-sm font-medium mb-2">
                Overall Progress
              </h3>
              <p className="text-3xl font-bold text-primary">
                {totalTarget > 0
                  ? ((totalSaved / totalTarget) * 100).toFixed(1)
                  : 0}
                %
              </p>
            </div>
          </div>

          {loading ? (
            <div className="text-center py-12 text-muted">Loading goals...</div>
          ) : goals.length === 0 ? (
            <div className="text-center py-16 bg-surface/50 border border-border rounded-2xl border-dashed">
              <div className="w-16 h-16 bg-surface-alt rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-3xl">🎯</span>
              </div>
              <h3 className="text-xl font-bold text-foreground mb-2">
                No goals yet
              </h3>
              <p className="text-muted mb-6">
                Create your first savings goal to start tracking
              </p>
              <button
                onClick={handleCreate}
                className="px-6 py-2 bg-primary text-white font-medium rounded-lg hover:bg-primary/90 transition-all"
              >
                Create Goal
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {goals.map((goal) => (
                <GoalCard
                  key={goal.id}
                  goal={goal}
                  onEdit={handleEdit}
                  onDelete={() => setDeletingGoal(goal)}
                  onAddMoney={handleAddMoney}
                />
              ))}
            </div>
          )}

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
                fetchGoals();
              }}
            />
          )}

          {deletingGoal && (
            <DeleteConfirmModal
              title="Delete Goal"
              message="Are you sure you want to delete this savings goal? This action cannot be undone."
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
