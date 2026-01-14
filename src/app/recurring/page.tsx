"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import NavBar from "@/components/NavBar";
import { Card, CardContent, MotionCard } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import Icon, { IconName } from "@/components/icons/Icon";
import RecurringTransactionModal from "@/components/RecurringTransactionModal";
import Image from "next/image";
import { format, formatDistanceToNow } from "date-fns";
import { motion, AnimatePresence } from "motion/react";

interface RecurringTransaction {
  id: string;
  description: string;
  amount: number;
  interval: string;
  next_run_date: string;
  active: boolean;
  category?: {
    name: string;
    icon: string;
    color: string;
  };
  account?: {
    name: string;
  };
}

const intervalLabels: Record<string, string> = {
  daily: "Daily",
  weekly: "Weekly",
  monthly: "Monthly",
  yearly: "Yearly",
};

export default function RecurringPage() {
  const { user, loading: authLoading } = useAuth();
  const [recurring, setRecurring] = useState<RecurringTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editId, setEditId] = useState<string | undefined>(undefined);
  const [suggestionData, setSuggestionData] = useState<any>(undefined);

  useEffect(() => {
    if (user) {
      fetchRecurring();
    }
  }, [user]);

  const fetchRecurring = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/recurring");
      const data = await res.json();
      if (data.recurring) {
        setRecurring(data.recurring);
      }
    } catch (error) {
      console.error("Error fetching recurring:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (id: string) => {
    setEditId(id);
    setSuggestionData(undefined);
    setIsModalOpen(true);
  };

  const handleAdd = () => {
    setEditId(undefined);
    setSuggestionData(undefined);
    setIsModalOpen(true);
  };

  const handleUseSuggestion = (suggestion: any) => {
    setEditId(undefined);
    setSuggestionData(suggestion);
    setIsModalOpen(true);
  };

  const handleToggleActive = async (id: string, currentStatus: boolean) => {
    try {
      const res = await fetch(`/api/recurring/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active: !currentStatus }),
      });
      if (res.ok) fetchRecurring();
    } catch (error) {
      console.error("Error toggling status:", error);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this recurring transaction?"))
      return;

    try {
      const res = await fetch(`/api/recurring/${id}`, {
        method: "DELETE",
      });
      if (res.ok) fetchRecurring();
    } catch (error) {
      console.error("Error deleting:", error);
    }
  };

  if (authLoading || !user) {
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

  const activeRecurring = recurring.filter((r) => r.active);
  const pausedRecurring = recurring.filter((r) => !r.active);
  const monthlyTotal = activeRecurring
    .filter((r) => r.interval === "monthly")
    .reduce((sum, r) => sum + r.amount, 0);

  return (
    <>
      <NavBar />
      <div className="min-h-screen bg-background">
        {/* Hero Header */}
        <div className="bg-gradient-to-br from-primary-pale via-cream to-sand">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-col md:flex-row md:items-center justify-between gap-6"
            >
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <motion.span
                    className="text-4xl"
                    animate={{ rotate: [0, 360] }}
                    transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
                  >
                    🔄
                  </motion.span>
                  <h1 className="text-3xl font-display font-bold text-foreground">
                    Autopilot
                  </h1>
                </div>
                <p className="text-text-secondary">
                  Set it and forget it - automatic transactions that keep your garden flowing
                </p>
              </div>

              <Button onClick={handleAdd} variant="bloom" size="lg" pill>
                <Icon name="plus" size={20} />
                Add Recurring
              </Button>
            </motion.div>
          </div>
        </div>

        <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 -mt-6">
          {/* Summary Card */}
          {activeRecurring.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-8"
            >
              <Card className="bg-gradient-to-r from-primary-pale to-growth-pale">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-text-secondary mb-1">Monthly Recurring</p>
                      <p className={`text-3xl font-bold font-mono ${monthlyTotal >= 0 ? 'text-growth' : 'text-foreground'}`}>
                        {monthlyTotal >= 0 ? '+' : ''}€{Math.abs(monthlyTotal).toFixed(2)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-text-secondary mb-1">Active</p>
                      <p className="text-2xl font-bold text-foreground">{activeRecurring.length}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* Suggestions Section */}
          <SuggestionsList onAdd={handleUseSuggestion} />

          {loading ? (
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => (
                <Card key={i} className="animate-pulse">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-sand rounded-xl" />
                      <div className="flex-1">
                        <div className="h-5 w-32 bg-sand rounded mb-2" />
                        <div className="h-4 w-48 bg-sand rounded" />
                      </div>
                      <div className="h-6 w-20 bg-sand rounded" />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : recurring.length === 0 ? (
            <EmptyState
              illustration="plant"
              title="No recurring transactions"
              description="Set up automatic transactions for bills, subscriptions, and income that repeat regularly."
              action={{
                label: "Create your first",
                onClick: handleAdd,
                variant: "bloom",
              }}
            />
          ) : (
            <div className="space-y-8">
              {/* Active Recurring */}
              {activeRecurring.length > 0 && (
                <section>
                  <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="flex items-center gap-2 mb-4"
                  >
                    <span className="text-xl">🌿</span>
                    <h2 className="text-lg font-display font-bold text-foreground">
                      Active
                    </h2>
                    <span className="text-sm text-text-secondary bg-growth-pale text-growth px-2 py-0.5 rounded-full">
                      {activeRecurring.length}
                    </span>
                  </motion.div>

                  <div className="space-y-3">
                    <AnimatePresence>
                      {activeRecurring.map((item, index) => (
                        <RecurringCard
                          key={item.id}
                          item={item}
                          index={index}
                          onEdit={handleEdit}
                          onDelete={handleDelete}
                          onToggle={handleToggleActive}
                        />
                      ))}
                    </AnimatePresence>
                  </div>
                </section>
              )}

              {/* Paused Recurring */}
              {pausedRecurring.length > 0 && (
                <section>
                  <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.1 }}
                    className="flex items-center gap-2 mb-4"
                  >
                    <span className="text-xl">💤</span>
                    <h2 className="text-lg font-display font-bold text-foreground">
                      Paused
                    </h2>
                    <span className="text-sm text-text-secondary bg-sand px-2 py-0.5 rounded-full">
                      {pausedRecurring.length}
                    </span>
                  </motion.div>

                  <div className="space-y-3">
                    <AnimatePresence>
                      {pausedRecurring.map((item, index) => (
                        <RecurringCard
                          key={item.id}
                          item={item}
                          index={index}
                          onEdit={handleEdit}
                          onDelete={handleDelete}
                          onToggle={handleToggleActive}
                        />
                      ))}
                    </AnimatePresence>
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
              onClick={handleAdd}
              variant="bloom"
              size="lg"
              className="w-14 h-14 rounded-full shadow-lg p-0"
            >
              <Icon name="plus" size={24} />
            </Button>
          </motion.div>
        </main>
      </div>

      <RecurringTransactionModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={fetchRecurring}
        editId={editId}
        initialData={suggestionData}
      />
    </>
  );
}

// Recurring Card Component
function RecurringCard({
  item,
  index,
  onEdit,
  onDelete,
  onToggle,
}: {
  item: RecurringTransaction;
  index: number;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
  onToggle: (id: string, active: boolean) => void;
}) {
  const nextDate = new Date(item.next_run_date);
  const isUpcoming = nextDate <= new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ delay: index * 0.05 }}
    >
      <Card className={`group ${!item.active ? "opacity-60" : ""}`}>
        <CardContent className="p-4">
          <div className="flex items-center gap-4">
            {/* Icon */}
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center transition-transform group-hover:scale-110"
              style={{
                backgroundColor: item.category
                  ? `${item.category.color}15`
                  : "var(--sand)",
                color: item.category?.color || "var(--text-secondary)",
              }}
            >
              <Icon
                name={(item.category?.icon as IconName) || "other"}
                size={24}
              />
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <h3 className="font-display font-bold text-foreground truncate">
                {item.description}
              </h3>
              <div className="flex items-center gap-2 text-sm text-text-secondary">
                <span className="px-2 py-0.5 bg-sand rounded-full text-xs font-medium">
                  {intervalLabels[item.interval] || item.interval}
                </span>
                <span>•</span>
                <span className={isUpcoming && item.active ? "text-primary font-medium" : ""}>
                  {isUpcoming && item.active ? "Soon: " : "Next: "}
                  {format(nextDate, "MMM d")}
                </span>
                <span>•</span>
                <span>{item.account?.name}</span>
              </div>
            </div>

            {/* Amount */}
            <div className="text-right mr-4">
              <span
                className={`text-lg font-bold font-mono ${
                  item.amount >= 0 ? "text-growth" : "text-foreground"
                }`}
              >
                {item.amount >= 0 ? "+" : ""}€{Math.abs(item.amount).toFixed(2)}
              </span>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <Button
                onClick={() => onToggle(item.id, item.active)}
                variant="ghost"
                size="sm"
                className={`p-2 h-auto ${
                  item.active
                    ? "text-growth hover:bg-growth/10"
                    : "text-text-secondary hover:bg-sand"
                }`}
                title={item.active ? "Pause" : "Resume"}
              >
                <Icon name={item.active ? "check" : "close"} size={18} />
              </Button>
              <Button
                onClick={() => onEdit(item.id)}
                variant="ghost"
                size="sm"
                className="p-2 h-auto text-text-secondary hover:text-primary hover:bg-primary/10"
                title="Edit"
              >
                <Icon name="edit" size={18} />
              </Button>
              <Button
                onClick={() => onDelete(item.id)}
                variant="ghost"
                size="sm"
                className="p-2 h-auto text-text-secondary hover:text-expense hover:bg-expense/10"
                title="Delete"
              >
                <Icon name="trash" size={18} />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

// Suggestions Component
function SuggestionsList({ onAdd }: { onAdd: (s: any) => void }) {
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/recurring/suggestions")
      .then((res) => res.json())
      .then((data) => {
        if (data.suggestions) setSuggestions(data.suggestions);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading || suggestions.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="mb-8"
    >
      <div className="flex items-center gap-2 mb-4">
        <Icon name="tip" size={20} className="text-primary" />
        <h2 className="text-lg font-display font-bold text-foreground">
          Suggested for you
        </h2>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {suggestions.map((s, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.05 }}
          >
            <Card className="border-primary/20 bg-primary-pale/30 hover:border-primary/40 transition-colors">
              <CardContent className="p-4">
                <div className="flex justify-between items-start mb-3">
                  <div className="font-medium text-foreground">{s.description}</div>
                  <div
                    className={`font-bold font-mono ${
                      s.amount >= 0 ? "text-growth" : "text-foreground"
                    }`}
                  >
                    {s.amount >= 0 ? "+" : ""}€{Math.abs(s.amount).toFixed(2)}
                  </div>
                </div>
                <div className="flex justify-between items-center">
                  <div className="text-xs text-text-secondary">
                    <span className="px-2 py-0.5 bg-surface rounded-full mr-2">
                      {intervalLabels[s.interval] || s.interval}
                    </span>
                    {s.occurrence_count} times
                  </div>
                  <Button size="sm" variant="secondary" onClick={() => onAdd(s)}>
                    <Icon name="plus" size={14} />
                    Add
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}
