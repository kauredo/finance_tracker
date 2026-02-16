"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useAuth } from "@/contexts/AuthContext";
import NavBar from "@/components/NavBar";
import ReportsCharts from "@/components/reports/ReportsCharts";
import DateRangePicker from "@/components/DateRangePicker";
import { Card, MotionCard, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { ProgressRing } from "@/components/ui/ProgressRing";
import { AmountDisplay } from "@/components/ui/AmountDisplay";
import { EmptyState } from "@/components/ui/EmptyState";
import Icon from "@/components/icons/Icon";
import Image from "next/image";
import { motion, AnimatePresence } from "motion/react";
import { useCurrency } from "@/hooks/useCurrency";
import { useDateRange } from "@/hooks/useDateRange";

interface CategoryData {
  name: string;
  value: number;
  color: string;
  [key: string]: string | number;
}

interface MonthlyData {
  month: string;
  expenses: number;
  income: number;
}

const COLORS = [
  "#ff8fab", // pink
  "#7cb482", // green
  "#64b5f6", // blue
  "#ffb74d", // amber
  "#ba68c8", // purple
  "#4dd0e1", // cyan
  "#ff8a65", // orange
  "#a1887f", // brown
];

export default function ReportsPage() {
  const { user, loading: authLoading } = useAuth();
  const { currency } = useCurrency();
  const router = useRouter();
  const pathname = usePathname();
  const { dateRange, setDateRange, setPreset } = useDateRange("all");
  const [showDatePicker, setShowDatePicker] = useState(false);

  // Fetch transactions from Convex with date filtering
  const transactionsData = useQuery(api.transactions.list, {
    limit: 1000,
    dateFrom: dateRange.startDate || undefined,
    dateTo: dateRange.endDate || undefined,
  });
  const loading = transactionsData === undefined;

  // Process data for charts and summary
  const { categoryData, monthlyData, summary } = useMemo(() => {
    if (!transactionsData?.transactions) {
      return {
        categoryData: [],
        monthlyData: [],
        summary: {
          totalIncome: 0,
          totalExpenses: 0,
          netSavings: 0,
          savingsRate: 0,
        },
      };
    }

    const categoryMap = new Map<string, { total: number; color: string }>();
    const monthMap = new Map<string, { expenses: number; income: number }>();

    let totalIncome = 0;
    let totalExpenses = 0;

    transactionsData.transactions.forEach((tx) => {
      const categoryName = tx.category?.name || "Other";
      const amount = tx.amount;
      const date = new Date(tx.date);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;

      // Category breakdown (only expenses)
      if (amount < 0) {
        const absAmount = Math.abs(amount);
        totalExpenses += absAmount;

        const existing = categoryMap.get(categoryName) || {
          total: 0,
          color: COLORS[categoryMap.size % COLORS.length],
        };
        existing.total += absAmount;
        categoryMap.set(categoryName, existing);

        // Monthly expenses
        const monthData = monthMap.get(monthKey) || {
          expenses: 0,
          income: 0,
        };
        monthData.expenses += absAmount;
        monthMap.set(monthKey, monthData);
      } else {
        totalIncome += amount;

        // Monthly income
        const monthData = monthMap.get(monthKey) || {
          expenses: 0,
          income: 0,
        };
        monthData.income += amount;
        monthMap.set(monthKey, monthData);
      }
    });

    // Convert to chart data
    const catData: CategoryData[] = Array.from(categoryMap.entries())
      .map(([name, data]) => ({
        name,
        value: parseFloat(data.total.toFixed(2)),
        color: data.color,
      }))
      .sort((a, b) => b.value - a.value);

    const monthData: MonthlyData[] = Array.from(monthMap.entries())
      .map(([month, data]) => ({
        month: new Date(month + "-01").toLocaleDateString("en-US", {
          month: "short",
          year: "numeric",
        }),
        expenses: parseFloat(data.expenses.toFixed(2)),
        income: parseFloat(data.income.toFixed(2)),
        rawDate: month, // for sorting
      }))
      .sort((a: any, b: any) => a.rawDate.localeCompare(b.rawDate))
      .slice(-6); // Last 6 months

    const netSavings = totalIncome - totalExpenses;
    const savingsRate = totalIncome > 0 ? (netSavings / totalIncome) * 100 : 0;

    return {
      categoryData: catData,
      monthlyData: monthData,
      summary: {
        totalIncome,
        totalExpenses,
        netSavings,
        savingsRate,
      },
    };
  }, [transactionsData]);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/auth");
    }
  }, [user, authLoading, router]);

  // Get health message based on savings rate
  const getFinancialHealth = () => {
    if (summary.savingsRate >= 30)
      return { emoji: "🌸", label: "Blooming!", status: "excellent" };
    if (summary.savingsRate >= 20)
      return { emoji: "🌿", label: "Thriving", status: "good" };
    if (summary.savingsRate >= 10)
      return { emoji: "🌱", label: "Growing", status: "okay" };
    if (summary.savingsRate > 0)
      return { emoji: "🌰", label: "Sprouting", status: "needs-attention" };
    return { emoji: "🥀", label: "Needs Water", status: "critical" };
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

  const health = getFinancialHealth();

  return (
    <div key={pathname} className="min-h-screen bg-background">
      <NavBar />

      {/* Hero Header */}
      <div className="bg-gradient-to-br from-primary-pale via-cream to-growth-pale">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col md:flex-row md:items-center justify-between gap-6"
          >
            <div>
              <div className="flex items-center gap-3 mb-2">
                <motion.span
                  className="text-4xl"
                  animate={{ scale: [1, 1.1, 1] }}
                  transition={{ duration: 2, repeat: Infinity }}
                >
                  📊
                </motion.span>
                <h1 className="text-3xl font-display font-bold text-foreground">
                  Financial Health Checkup
                </h1>
              </div>
              <p className="text-text-secondary">
                See how your financial garden is growing over time
              </p>
            </div>

            {/* Health Badge */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2 }}
              className="flex items-center gap-3 bg-surface px-5 py-3 rounded-2xl shadow-sm"
            >
              <span className="text-3xl">{health.emoji}</span>
              <div>
                <p className="text-sm text-text-secondary">Garden Status</p>
                <p className="font-display font-bold text-foreground">
                  {health.label}
                </p>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 -mt-6">
        {/* Date Range Filter */}
        <div className="mb-6">
          <div className="flex items-center gap-3">
            <Button
              variant="secondary"
              onClick={() => setShowDatePicker(!showDatePicker)}
              className={showDatePicker ? "ring-2 ring-primary/30" : ""}
            >
              <Icon name="calendar" size={18} />
              {dateRange.startDate ? "Custom Range" : "All Time"}
            </Button>
            {dateRange.startDate && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setPreset("all")}
              >
                Clear filter
              </Button>
            )}
          </div>
          <AnimatePresence>
            {showDatePicker && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="mt-3 overflow-hidden"
              >
                <Card className="bg-sand/30">
                  <CardContent className="p-4">
                    <DateRangePicker
                      startDate={dateRange.startDate}
                      endDate={dateRange.endDate}
                      onChange={(start, end) =>
                        setDateRange({ startDate: start, endDate: end })
                      }
                      onPresetChange={setPreset}
                    />
                  </CardContent>
                </Card>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-8">
            {[...Array(4)].map((_, i) => (
              <Card key={i} className="animate-pulse">
                <CardContent className="p-6">
                  <div className="h-6 w-24 bg-sand rounded-lg mb-3" />
                  <div className="h-8 w-32 bg-sand rounded-lg" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <>
            {/* Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-8">
              <MotionCard variant="glass" transition={{ delay: 0.1 }}>
                <CardContent className="p-6">
                  <div className="flex items-center gap-4 h-full min-h-[64px]">
                    <div className="w-12 h-12 flex items-center justify-center flex-shrink-0 bg-growth-pale rounded-2xl">
                      <Icon name="income" size={24} className="text-growth" />
                    </div>
                    <div>
                      <p className="text-sm text-text-secondary font-medium">
                        Total Income
                      </p>
                      <AmountDisplay
                        value={summary.totalIncome}
                        currency={currency}
                        variant="income"
                        size="md"
                      />
                    </div>
                  </div>
                </CardContent>
              </MotionCard>

              <MotionCard variant="glass" transition={{ delay: 0.15 }}>
                <CardContent className="p-6">
                  <div className="flex items-center gap-4 h-full min-h-[64px]">
                    <div className="w-12 h-12 flex items-center justify-center flex-shrink-0 bg-expense/10 rounded-2xl">
                      <Icon name="expense" size={24} className="text-expense" />
                    </div>
                    <div>
                      <p className="text-sm text-text-secondary font-medium">
                        Total Expenses
                      </p>
                      <AmountDisplay
                        value={summary.totalExpenses}
                        currency={currency}
                        variant="expense"
                        size="md"
                      />
                    </div>
                  </div>
                </CardContent>
              </MotionCard>

              <MotionCard variant="glass" transition={{ delay: 0.2 }}>
                <CardContent className="p-6">
                  <div className="flex items-center gap-4 h-full min-h-[64px]">
                    <div className="w-12 h-12 flex items-center justify-center flex-shrink-0 bg-primary-pale rounded-2xl">
                      <Icon name="savings" size={24} className="text-primary" />
                    </div>
                    <div>
                      <p className="text-sm text-text-secondary font-medium">
                        Net Savings
                      </p>
                      <AmountDisplay
                        value={summary.netSavings}
                        currency={currency}
                        variant={summary.netSavings >= 0 ? "income" : "expense"}
                        size="md"
                      />
                    </div>
                  </div>
                </CardContent>
              </MotionCard>

              <MotionCard variant="glass" transition={{ delay: 0.25 }}>
                <CardContent className="p-6">
                  <div className="flex items-center gap-4 h-full min-h-[64px]">
                    <div className="w-12 h-12 flex items-center justify-center flex-shrink-0">
                      <ProgressRing
                        progress={Math.max(
                          0,
                          Math.min(100, summary.savingsRate),
                        )}
                        size="md"
                        color={
                          summary.savingsRate >= 20
                            ? "growth"
                            : summary.savingsRate > 0
                              ? "primary"
                              : "danger"
                        }
                      />
                    </div>
                    <div>
                      <p className="text-sm text-text-secondary font-medium">
                        Savings Rate
                      </p>
                      <p
                        className={`text-2xl font-bold tabular-nums ${
                          summary.savingsRate >= 20
                            ? "text-growth"
                            : summary.savingsRate > 0
                              ? "text-primary"
                              : "text-expense"
                        }`}
                      >
                        {summary.savingsRate.toFixed(1)}%
                      </p>
                    </div>
                  </div>
                </CardContent>
              </MotionCard>
            </div>

            {/* Charts */}
            {categoryData.length > 0 || monthlyData.length > 0 ? (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
              >
                <ReportsCharts
                  categoryData={categoryData}
                  monthlyData={monthlyData}
                />
              </motion.div>
            ) : (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.3 }}
              >
                <EmptyState
                  illustration="chart"
                  title="No data to analyze yet"
                  description="Add some transactions to see your financial health insights bloom."
                />
              </motion.div>
            )}

            {/* Tips Section */}
            {!loading &&
              summary.savingsRate < 20 &&
              categoryData.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                  className="mt-8"
                >
                  <Card className="bg-primary-pale/50 border-primary/20">
                    <CardContent className="p-6">
                      <div className="flex items-start gap-4">
                        <div className="p-3 bg-primary/10 rounded-2xl">
                          <Icon name="tip" size={24} className="text-primary" />
                        </div>
                        <div>
                          <h3 className="font-display font-bold text-foreground mb-2">
                            Growing Tips 🌱
                          </h3>
                          <p className="text-text-secondary">
                            Your top spending category is{" "}
                            <strong>{categoryData[0]?.name}</strong>. Consider
                            reviewing these expenses to help your savings grow.
                            A healthy garden needs at least 20% savings rate to
                            thrive!
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              )}
          </>
        )}
      </main>
    </div>
  );
}
