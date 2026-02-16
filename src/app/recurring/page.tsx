"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import { useAuth } from "@/contexts/AuthContext";
import NavBar from "@/components/NavBar";
import { Card, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { Badge } from "@/components/ui/Badge";
import Icon, { IconName } from "@/components/icons/Icon";
import RecurringTransactionModal from "@/components/RecurringTransactionModal";
import Image from "next/image";
import { format } from "date-fns";
import { motion, AnimatePresence } from "motion/react";
import { useCurrency } from "@/hooks/useCurrency";

interface RecurringTransaction {
  _id: Id<"recurringTransactions">;
  description: string;
  amount: number;
  interval: "daily" | "weekly" | "monthly" | "yearly";
  nextRunDate: string;
  active: boolean;
  category?: {
    name: string;
    icon?: string;
    color?: string;
  } | null;
  account?: {
    name: string;
  } | null;
}

const intervalLabels: Record<string, string> = {
  daily: "Daily",
  weekly: "Weekly",
  monthly: "Monthly",
  yearly: "Yearly",
};

export default function RecurringPage() {
  const { user, loading: authLoading } = useAuth();
  const { formatAmount } = useCurrency();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editId, setEditId] = useState<Id<"recurringTransactions"> | undefined>(
    undefined,
  );
  const [suggestionData, setSuggestionData] = useState<any>(undefined);

  // Fetch recurring transactions from Convex
  const recurringData = useQuery(api.recurring.list);
  const deleteRecurring = useMutation(api.recurring.remove);
  const toggleRecurring = useMutation(api.recurring.toggleActive);

  const loading = recurringData === undefined;
  const recurring = (recurringData ?? []) as RecurringTransaction[];

  const handleEdit = (id: Id<"recurringTransactions">) => {
    setEditId(id);
    setSuggestionData(undefined);
    setIsModalOpen(true);
  };

  const handleAdd = () => {
    setEditId(undefined);
    setSuggestionData(undefined);
    setIsModalOpen(true);
  };

  const handleDelete = async (id: Id<"recurringTransactions">) => {
    if (!confirm("Are you sure you want to delete this recurring transaction?"))
      return;

    try {
      await deleteRecurring({ id });
    } catch (error) {
      console.error("Error deleting:", error);
    }
  };

  const handleToggle = async (id: Id<"recurringTransactions">) => {
    try {
      await toggleRecurring({ id });
    } catch (error) {
      console.error("Error toggling:", error);
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
          <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10">
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
                    transition={{
                      duration: 10,
                      repeat: Infinity,
                      ease: "linear",
                    }}
                  >
                    🔄
                  </motion.span>
                  <h1 className="text-3xl font-display font-bold text-foreground">
                    Autopilot
                  </h1>
                </div>
                <p className="text-text-secondary">
                  Set it and forget it - automatic transactions that keep your
                  garden flowing
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
                      <p className="text-sm text-text-secondary mb-1">
                        Monthly Recurring
                      </p>
                      <p
                        className={`text-3xl font-bold tabular-nums ${monthlyTotal >= 0 ? "text-growth" : "text-foreground"}`}
                      >
                        {monthlyTotal >= 0 ? "+" : ""}
                        {formatAmount(Math.abs(monthlyTotal))}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-text-secondary mb-1">Active</p>
                      <p className="text-2xl font-bold text-foreground">
                        {activeRecurring.length}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}

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
                    <Badge variant="growth" size="sm" pill>
                      {activeRecurring.length}
                    </Badge>
                  </motion.div>

                  <div className="space-y-3">
                    <AnimatePresence>
                      {activeRecurring.map((item, index) => (
                        <RecurringCard
                          key={item._id}
                          item={item}
                          index={index}
                          onEdit={handleEdit}
                          onDelete={handleDelete}
                          onToggle={handleToggle}
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
                    <Badge variant="default" size="sm" pill>
                      {pausedRecurring.length}
                    </Badge>
                  </motion.div>

                  <div className="space-y-3">
                    <AnimatePresence>
                      {pausedRecurring.map((item, index) => (
                        <RecurringCard
                          key={item._id}
                          item={item}
                          index={index}
                          onEdit={handleEdit}
                          onDelete={handleDelete}
                          onToggle={handleToggle}
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
        onSuccess={() => {
          setIsModalOpen(false);
          // Convex auto-refreshes data
        }}
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
  onEdit: (id: Id<"recurringTransactions">) => void;
  onDelete: (id: Id<"recurringTransactions">) => void;
  onToggle: (id: Id<"recurringTransactions">) => void;
}) {
  const { formatAmount } = useCurrency();
  const nextDate = new Date(item.nextRunDate);
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
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
            <div className="flex items-center gap-3 sm:gap-4 flex-1 min-w-0">
              {/* Icon */}
              <div
                className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center flex-shrink-0 transition-transform group-hover:scale-110"
                style={{
                  backgroundColor: item.category
                    ? `${item.category.color}15`
                    : "var(--sand)",
                  color: item.category?.color || "var(--text-secondary)",
                }}
              >
                <Icon
                  name={(item.category?.icon as IconName) || "other"}
                  size={20}
                  className="sm:w-6 sm:h-6"
                />
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="font-display font-bold text-foreground truncate">
                    {item.description}
                  </h3>
                  {/* Amount - inline on mobile */}
                  <span
                    className={`sm:hidden text-base font-bold tabular-nums flex-shrink-0 ${
                      item.amount >= 0 ? "text-growth" : "text-foreground"
                    }`}
                  >
                    {item.amount >= 0 ? "+" : ""}
                    {formatAmount(Math.abs(item.amount))}
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 text-sm text-text-secondary mt-0.5">
                  <span className="px-2 py-0.5 bg-sand rounded-full text-xs font-medium">
                    {intervalLabels[item.interval] || item.interval}
                  </span>
                  <span className="hidden sm:inline">•</span>
                  <span
                    className={
                      isUpcoming && item.active
                        ? "text-primary font-medium"
                        : ""
                    }
                  >
                    {isUpcoming && item.active ? "Soon: " : "Next: "}
                    {format(nextDate, "MMM d")}
                  </span>
                  <span className="hidden sm:inline">•</span>
                  <span className="hidden sm:inline">{item.account?.name}</span>
                </div>
              </div>
            </div>

            {/* Amount - separate on desktop */}
            <div className="hidden sm:block text-right mr-4">
              <span
                className={`text-lg font-bold tabular-nums ${
                  item.amount >= 0 ? "text-growth" : "text-foreground"
                }`}
              >
                {item.amount >= 0 ? "+" : ""}
                {formatAmount(Math.abs(item.amount))}
              </span>
            </div>

            {/* Actions - visible on mobile, hover on desktop */}
            <div className="flex items-center gap-1 justify-end sm:justify-start md:opacity-0 md:group-hover:opacity-100 transition-opacity">
              <Button
                onClick={() => onToggle(item._id)}
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
                onClick={() => onEdit(item._id)}
                variant="ghost"
                size="sm"
                className="p-2 h-auto text-text-secondary hover:text-primary hover:bg-primary/10"
                title="Edit"
              >
                <Icon name="edit" size={18} />
              </Button>
              <Button
                onClick={() => onDelete(item._id)}
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
