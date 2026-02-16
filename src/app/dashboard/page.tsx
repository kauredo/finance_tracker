"use client";

import Link from "next/link";
import { useEffect, useState, useMemo } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useAuth } from "@/contexts/AuthContext";
import NavBar from "@/components/NavBar";
import WelcomeTour from "@/components/WelcomeTour";
import AddAccountModal from "@/components/AddAccountModal";
import AddTransactionModal from "@/components/AddTransactionModal";
import UploadStatementModal from "@/components/UploadStatementModal";
import InvitePartnerModal from "@/components/InvitePartnerModal";
import TransactionsList from "@/components/TransactionsList";
import { Button } from "@/components/ui/Button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  MotionCard,
} from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";
import { ProgressRing } from "@/components/ui/ProgressRing";
import { AmountDisplay } from "@/components/ui/AmountDisplay";
import GoalsWidget from "@/components/dashboard/GoalsWidget";
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";
import { useCurrency } from "@/hooks/useCurrency";
import { motion } from "motion/react";
import Icon from "@/components/icons/Icon";

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

export default function DashboardPage() {
  const { user, loading, isAuthenticated } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [showAddTransaction, setShowAddTransaction] = useState(false);
  const [showUploadStatement, setShowUploadStatement] = useState(false);
  const [showAccountModal, setShowAccountModal] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showWelcomeTour, setShowWelcomeTour] = useState(false);

  // Get current month date range for monthly stats
  const dateRange = useMemo(() => {
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
    return {
      from: firstDay.toISOString().split("T")[0],
      to: now.toISOString().split("T")[0],
    };
  }, []);

  // Fetch user profile using Convex
  const userProfile = useQuery(api.users.getCurrentUserProfile);

  // Fetch all-time stats
  const allTimeStats = useQuery(api.transactions.getStats, {});

  // Fetch monthly stats
  const monthlyStats = useQuery(api.transactions.getStats, {
    dateFrom: dateRange.from,
    dateTo: dateRange.to,
  });

  // Fetch budgets
  const budgets = useQuery(api.budgets.list);

  // Mark welcome tour as seen mutation
  const markWelcomeTourSeen = useMutation(api.users.markWelcomeTourSeen);

  // Calculate derived stats
  const stats = useMemo(() => {
    const totalBudget = budgets?.reduce((sum, b) => sum + b.amount, 0) ?? 0;
    return {
      totalExpenses: allTimeStats?.expenses ?? 0,
      monthlyExpenses: monthlyStats?.expenses ?? 0,
      savings: allTimeStats?.net ?? 0,
      totalBudget,
      budgetSpent: monthlyStats?.expenses ?? 0,
      totalIncome: allTimeStats?.income ?? 0,
    };
  }, [allTimeStats, monthlyStats, budgets]);

  // Check welcome tour when user profile loads
  useEffect(() => {
    if (userProfile && !userProfile.hasSeenWelcomeTour) {
      setShowWelcomeTour(true);
    }
  }, [userProfile]);

  // Get user's first name
  const userName = userProfile?.fullName?.split(" ")[0] ?? "";

  // Redirect to auth if not authenticated, or pending if not confirmed
  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.push("/auth");
    } else if (!loading && user && !user.isConfirmed) {
      router.push("/pending");
    }
  }, [loading, isAuthenticated, user, router]);

  const { currency, formatAmount } = useCurrency();

  // Keyboard shortcuts
  useKeyboardShortcuts([
    {
      key: "n",
      handler: () => setShowAddTransaction(true),
      description: "Add new transaction",
    },
    {
      key: "u",
      handler: () => setShowUploadStatement(true),
      description: "Upload statement",
    },
    {
      key: "Escape",
      handler: () => {
        if (showAddTransaction) setShowAddTransaction(false);
        if (showUploadStatement) setShowUploadStatement(false);
        if (showAccountModal) setShowAccountModal(false);
        if (showInviteModal) setShowInviteModal(false);
        if (showWelcomeTour) setShowWelcomeTour(false);
      },
      description: "Close modal",
    },
  ]);

  if (loading || !isAuthenticated) {
    return (
      <div className="min-h-screen bg-background">
        <NavBar />
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="mb-8">
            <Skeleton variant="text" className="w-48 h-8 mb-2" />
            <Skeleton variant="text" className="w-64 h-6" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            {[1, 2, 3].map((i) => (
              <Card key={i}>
                <CardContent>
                  <Skeleton variant="text" className="w-24 h-4 mb-2" />
                  <Skeleton variant="text" className="w-32 h-8" />
                </CardContent>
              </Card>
            ))}
          </div>
        </main>
      </div>
    );
  }

  const budgetPercentage =
    stats.totalBudget > 0
      ? Math.min((stats.budgetSpent / stats.totalBudget) * 100, 100)
      : 0;
  const budgetColor =
    budgetPercentage > 90
      ? "danger"
      : budgetPercentage > 70
        ? "warning"
        : "growth";

  return (
    <div key={pathname} className="min-h-screen bg-background">
      <NavBar />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header with greeting */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-3xl md:text-4xl font-display font-bold text-foreground">
            {getGreeting()}
            {userName ? `, ${userName}` : ""}!
          </h1>
          <p className="text-text-secondary mt-2">
            Here&apos;s how your finances are growing today.
          </p>
        </motion.div>

        {/* Hero Balance Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-8"
        >
          <Card variant="growing" className="p-8">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
              <div>
                <p className="text-sm text-text-secondary font-medium uppercase tracking-wide mb-2">
                  Net Balance
                </p>
                <AmountDisplay
                  value={stats.savings}
                  currency={currency}
                  size="hero"
                  variant={stats.savings >= 0 ? "income" : "expense"}
                  animated
                />
                <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mt-4">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-growth" />
                    <span className="text-sm text-text-secondary">
                      Income:{" "}
                      <span className="text-growth font-medium">
                        {formatAmount(stats.totalIncome, 0)}
                      </span>
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-expense" />
                    <span className="text-sm text-text-secondary">
                      Expenses:{" "}
                      <span className="text-expense font-medium">
                        {formatAmount(stats.totalExpenses, 0)}
                      </span>
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
                <Button
                  variant="bloom"
                  pill
                  onClick={() => setShowAddTransaction(true)}
                  className="w-full sm:w-auto justify-center"
                >
                  <Icon name="plus" size={18} />
                  <span>Add Transaction</span>
                </Button>
                <Button
                  variant="soft"
                  pill
                  onClick={() => setShowUploadStatement(true)}
                  className="w-full sm:w-auto justify-center"
                >
                  <Icon name="upload" size={18} />
                  <span>Upload Statement</span>
                </Button>
                <Button
                  variant="soft"
                  pill
                  onClick={() => setShowAccountModal(true)}
                  className="w-full sm:w-auto justify-center"
                >
                  <Icon name="wallet" size={18} />
                  <span>Add Account</span>
                </Button>
              </div>
            </div>
          </Card>
        </motion.div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <MotionCard
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <CardContent>
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-text-secondary font-medium mb-2">
                    This Month&apos;s Spending
                  </p>
                  <AmountDisplay
                    value={stats.monthlyExpenses}
                    currency={currency}
                    size="lg"
                    animated
                  />
                </div>
                <div className="p-3 rounded-2xl bg-primary-pale">
                  <Icon
                    name="transactions"
                    size={24}
                    className="text-primary"
                  />
                </div>
              </div>
            </CardContent>
          </MotionCard>

          <MotionCard
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.12 }}
          >
            <CardContent>
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-text-secondary font-medium mb-2">
                    Budget Status
                  </p>
                  <div className="flex items-baseline gap-2">
                    <AmountDisplay
                      value={stats.budgetSpent}
                      currency={currency}
                      size="lg"
                      animated
                    />
                    <span className="text-text-secondary text-sm">
                      / {formatAmount(stats.totalBudget, 0)}
                    </span>
                  </div>
                </div>
                <ProgressRing
                  progress={budgetPercentage}
                  size="sm"
                  color={budgetColor}
                />
              </div>
            </CardContent>
          </MotionCard>

          <MotionCard
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            variant="warm"
          >
            <CardContent>
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-text-secondary font-medium mb-2">
                    Total Saved
                  </p>
                  <AmountDisplay
                    value={Math.max(0, stats.savings)}
                    currency={currency}
                    size="lg"
                    variant="income"
                    animated
                  />
                </div>
                <div className="p-3 rounded-2xl bg-growth-pale">
                  <Icon name="savings" size={24} className="text-growth" />
                </div>
              </div>
            </CardContent>
          </MotionCard>
        </div>

        {/* Two column layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Budget Overview */}
          <MotionCard
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.18 }}
            className="h-full"
          >
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Monthly Budget</CardTitle>
                <Link
                  href="/budgets"
                  className="text-sm text-primary hover:underline"
                >
                  Manage
                </Link>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-6">
                <ProgressRing
                  progress={budgetPercentage}
                  size="lg"
                  color={budgetColor}
                  label="spent"
                />
                <div className="flex-1">
                  <div className="space-y-3">
                    <div className="flex justify-between text-sm">
                      <span className="text-text-secondary">Spent</span>
                      <span className="font-medium">
                        {formatAmount(stats.budgetSpent)}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-text-secondary">Budget</span>
                      <span className="font-medium">
                        {formatAmount(stats.totalBudget)}
                      </span>
                    </div>
                    <div className="pt-3 border-t border-border">
                      <div className="flex justify-between text-sm">
                        <span className="text-text-secondary">Remaining</span>
                        <span
                          className={`font-bold ${stats.totalBudget - stats.budgetSpent >= 0 ? "text-growth" : "text-expense"}`}
                        >
                          {formatAmount(stats.totalBudget - stats.budgetSpent)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </MotionCard>

          {/* Goals Widget */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <GoalsWidget />
          </motion.div>
        </div>

        {/* Recent Transactions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
        >
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Recent Transactions</CardTitle>
                <Link
                  href="/transactions"
                  className="text-sm text-primary hover:underline"
                >
                  View all
                </Link>
              </div>
            </CardHeader>
            <CardContent>
              <TransactionsList showPagination={false} />
            </CardContent>
          </Card>
        </motion.div>
      </main>

      {/* Modals */}
      {showAddTransaction && (
        <AddTransactionModal
          onClose={() => setShowAddTransaction(false)}
          onSuccess={() => setShowAddTransaction(false)}
        />
      )}
      {showUploadStatement && (
        <UploadStatementModal
          onClose={() => setShowUploadStatement(false)}
          onSuccess={() => setShowUploadStatement(false)}
        />
      )}
      {showAccountModal && (
        <AddAccountModal
          onClose={() => setShowAccountModal(false)}
          onSuccess={() => setShowAccountModal(false)}
        />
      )}
      {showInviteModal && (
        <InvitePartnerModal onClose={() => setShowInviteModal(false)} />
      )}
      {showWelcomeTour && (
        <WelcomeTour
          onClose={() => {
            setShowWelcomeTour(false);
            markWelcomeTourSeen({});
          }}
        />
      )}
    </div>
  );
}
