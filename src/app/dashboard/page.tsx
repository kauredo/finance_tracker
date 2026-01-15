"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import NavBar from "@/components/NavBar";
import FileUpload from "@/components/FileUpload";
import WelcomeTour from "@/components/WelcomeTour";
import AddAccountModal from "@/components/AddAccountModal";
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
import { Tooltip } from "@/components/ui/Tooltip";
import { ProgressRing } from "@/components/ui/ProgressRing";
import { AmountDisplay } from "@/components/ui/AmountDisplay";
import GoalsWidget from "@/components/dashboard/GoalsWidget";
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";
import { motion } from "motion/react";
import Icon from "@/components/icons/Icon";

import { createClient } from "@/utils/supabase/client";

interface DashboardStats {
  totalExpenses: number;
  monthlyExpenses: number;
  savings: number;
  totalBudget: number;
  budgetSpent: number;
  totalIncome: number;
}

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

export default function DashboardPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [showUpload, setShowUpload] = useState(false);
  const [showAccountModal, setShowAccountModal] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showWelcomeTour, setShowWelcomeTour] = useState(false);
  const [userName, setUserName] = useState("");

  // Filters
  const dateRange = {
    from: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
    to: new Date(),
  };
  const selectedAccount = "all";

  const [stats, setStats] = useState<DashboardStats>({
    totalExpenses: 0,
    monthlyExpenses: 0,
    savings: 0,
    totalBudget: 0,
    budgetSpent: 0,
    totalIncome: 0,
  });

  useEffect(() => {
    const fetchUserProfile = async () => {
      try {
        const supabase = createClient();
        const { data: profile } = await supabase
          .from("profiles")
          .select("full_name")
          .eq("id", user!.id)
          .single();

        if (profile?.full_name) {
          setUserName(profile.full_name.split(" ")[0]);
        }
      } catch (error) {
        console.error("Error fetching profile:", error);
      }
    };

    const checkWelcomeTour = async () => {
      try {
        const supabase = createClient();
        const { data: profile } = await supabase
          .from("profiles")
          .select("has_seen_welcome_tour")
          .eq("id", user!.id)
          .single();

        if (profile && !profile.has_seen_welcome_tour) {
          setShowWelcomeTour(true);
        }
      } catch (error) {
        console.error("Error checking welcome tour:", error);
      }
    };

    const fetchDashboardData = async () => {
      try {
        const supabase = createClient();

        // Trigger recurring transaction processing (no recursive call to avoid infinite loop)
        fetch("/api/recurring/process", { method: "POST" })
          .then((res) => res.json())
          .catch((err) => console.error("Error processing recurring:", err));

        // Fetch transactions
        const { data: transactionsData, error: transactionsError } =
          await supabase.from("transactions").select("amount, date");

        if (transactionsError) throw transactionsError;

        const now = new Date();
        const currentMonth = now.getMonth();
        const currentYear = now.getFullYear();

        const newStats = (transactionsData || []).reduce(
          (acc: any, curr: any) => {
            const amount = curr.amount;
            const date = new Date(curr.date);

            if (amount < 0) {
              acc.totalExpenses += Math.abs(amount);
              if (
                date.getMonth() === currentMonth &&
                date.getFullYear() === currentYear
              ) {
                acc.monthlyExpenses += Math.abs(amount);
              }
            } else {
              acc.totalIncome += amount;
            }
            acc.savings += amount;
            return acc;
          },
          {
            totalExpenses: 0,
            monthlyExpenses: 0,
            savings: 0,
            totalBudget: 0,
            budgetSpent: 0,
            totalIncome: 0,
          },
        );

        // Fetch Budgets
        const { data: budgets } = await supabase
          .from("budgets")
          .select("amount");

        if (budgets) {
          newStats.totalBudget = budgets.reduce((sum, b) => sum + b.amount, 0);
          newStats.budgetSpent = newStats.monthlyExpenses;
        }

        setStats(newStats);
      } catch (error) {
        console.error("Error fetching stats:", error);
      }
    };

    if (!loading && !user) {
      router.push("/auth");
    } else if (user) {
      fetchDashboardData();
      checkWelcomeTour();
      fetchUserProfile();
    }
  }, [user, loading, router, dateRange, selectedAccount]);

  // Keyboard shortcuts
  useKeyboardShortcuts([
    {
      key: "n",
      handler: () => setShowUpload(true),
      description: "Upload new statement",
    },
    {
      key: "Escape",
      handler: () => {
        if (showUpload) setShowUpload(false);
        if (showAccountModal) setShowAccountModal(false);
        if (showInviteModal) setShowInviteModal(false);
        if (showWelcomeTour) setShowWelcomeTour(false);
      },
      description: "Close modal",
    },
  ]);

  if (loading || !user) {
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
                  size="hero"
                  variant={stats.savings >= 0 ? "income" : "expense"}
                  animated
                />
                <div className="flex items-center gap-4 mt-4">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-growth" />
                    <span className="text-sm text-text-secondary">
                      Income:{" "}
                      <span className="text-growth font-medium">
                        €{stats.totalIncome.toFixed(0)}
                      </span>
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-expense" />
                    <span className="text-sm text-text-secondary">
                      Expenses:{" "}
                      <span className="text-expense font-medium">
                        €{stats.totalExpenses.toFixed(0)}
                      </span>
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <Button
                  variant="bloom"
                  pill
                  onClick={() => setShowUpload(true)}
                >
                  <Icon name="plus" size={18} />
                  Add Transaction
                </Button>
                <Button
                  variant="soft"
                  pill
                  onClick={() => router.push("/reports")}
                >
                  View Reports
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
            transition={{ delay: 0.2 }}
          >
            <CardContent>
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-text-secondary font-medium mb-2">
                    This Month&apos;s Spending
                  </p>
                  <AmountDisplay
                    value={stats.monthlyExpenses}
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
            transition={{ delay: 0.25 }}
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
                      size="lg"
                      animated
                    />
                    <span className="text-text-secondary text-sm">
                      / €{stats.totalBudget.toFixed(0)}
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
            transition={{ delay: 0.3 }}
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
            transition={{ delay: 0.35 }}
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
                        €{stats.budgetSpent.toFixed(2)}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-text-secondary">Budget</span>
                      <span className="font-medium">
                        €{stats.totalBudget.toFixed(2)}
                      </span>
                    </div>
                    <div className="pt-3 border-t border-border">
                      <div className="flex justify-between text-sm">
                        <span className="text-text-secondary">Remaining</span>
                        <span
                          className={`font-bold ${stats.totalBudget - stats.budgetSpent >= 0 ? "text-growth" : "text-expense"}`}
                        >
                          €{(stats.totalBudget - stats.budgetSpent).toFixed(2)}
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
            transition={{ delay: 0.4 }}
          >
            <GoalsWidget />
          </motion.div>
        </div>

        {/* Quick Actions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.45 }}
        >
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent>
              {showUpload ? (
                <div className="bg-sand/50 p-6 rounded-2xl border border-border">
                  <div className="flex justify-between items-center mb-6">
                    <h3 className="text-foreground font-medium font-display">
                      Upload Bank Statement
                    </h3>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowUpload(false)}
                    >
                      Close
                    </Button>
                  </div>
                  <FileUpload onUploadComplete={() => setShowUpload(false)} />
                </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <Tooltip content="Upload a bank statement (Press 'n')">
                    <button
                      onClick={() => setShowUpload(true)}
                      className="flex flex-col items-center gap-3 p-6 rounded-2xl bg-primary-pale hover:bg-primary-light/30 transition-all group"
                    >
                      <div className="p-3 rounded-xl bg-primary/10 group-hover:bg-primary/20 transition-colors">
                        <Icon
                          name="upload"
                          size={24}
                          className="text-primary"
                        />
                      </div>
                      <span className="text-sm font-medium text-foreground">
                        Upload Statement
                      </span>
                    </button>
                  </Tooltip>
                  <Tooltip content="Create a new account">
                    <button
                      onClick={() => setShowAccountModal(true)}
                      className="flex flex-col items-center gap-3 p-6 rounded-2xl bg-growth-pale hover:bg-growth-light/30 transition-all group"
                    >
                      <div className="p-3 rounded-xl bg-growth/10 group-hover:bg-growth/20 transition-colors">
                        <Icon name="wallet" size={24} className="text-growth" />
                      </div>
                      <span className="text-sm font-medium text-foreground">
                        Add Account
                      </span>
                    </button>
                  </Tooltip>
                  <Tooltip content="Invite a partner to your household">
                    <button
                      onClick={() => setShowInviteModal(true)}
                      className="flex flex-col items-center gap-3 p-6 rounded-2xl bg-info-light hover:bg-info/20 transition-all group"
                    >
                      <div className="p-3 rounded-xl bg-info/10 group-hover:bg-info/20 transition-colors">
                        <Icon name="joint" size={24} className="text-info" />
                      </div>
                      <span className="text-sm font-medium text-foreground">
                        Invite Partner
                      </span>
                    </button>
                  </Tooltip>
                  <Tooltip content="View detailed analytics and reports">
                    <button
                      onClick={() => router.push("/reports")}
                      className="flex flex-col items-center gap-3 p-6 rounded-2xl bg-warning-light hover:bg-warning/20 transition-all group"
                    >
                      <div className="p-3 rounded-xl bg-warning/10 group-hover:bg-warning/20 transition-colors">
                        <Icon
                          name="reports"
                          size={24}
                          className="text-warning"
                        />
                      </div>
                      <span className="text-sm font-medium text-foreground">
                        View Reports
                      </span>
                    </button>
                  </Tooltip>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Recent Transactions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
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
              <TransactionsList />
            </CardContent>
          </Card>
        </motion.div>
      </main>

      {/* Modals */}
      {showAccountModal && (
        <AddAccountModal
          onClose={() => setShowAccountModal(false)}
          onSuccess={() => {}}
        />
      )}
      {showInviteModal && (
        <InvitePartnerModal onClose={() => setShowInviteModal(false)} />
      )}
      {showWelcomeTour && (
        <WelcomeTour onClose={() => setShowWelcomeTour(false)} />
      )}
    </div>
  );
}
