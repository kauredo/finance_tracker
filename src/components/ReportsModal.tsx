"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

interface ReportsModalProps {
  onClose: () => void;
}

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
  "#3b82f6", // blue
  "#ef4444", // red
  "#10b981", // green
  "#f59e0b", // amber
  "#8b5cf6", // purple
  "#ec4899", // pink
  "#06b6d4", // cyan
  "#f97316", // orange
];

export default function ReportsModal({ onClose }: ReportsModalProps) {
  const [categoryData, setCategoryData] = useState<CategoryData[]>([]);
  const [monthlyData, setMonthlyData] = useState<MonthlyData[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<"category" | "monthly">("category");

  useEffect(() => {
    fetchReportsData();
  }, []);

  const fetchReportsData = async () => {
    try {
      setLoading(true);
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      // Fetch transactions with categories
      const { data: transactions, error } = await supabase
        .from("transactions")
        .select("amount, date, category_id, categories(name)")
        .order("date", { ascending: true });

      if (error) throw error;

      // Process category data
      const categoryMap = new Map<string, { total: number; color: string }>();
      const monthMap = new Map<string, { expenses: number; income: number }>();

      transactions?.forEach((tx, index) => {
        const categoryName = (tx.categories as any)?.name || "Other";
        const amount = tx.amount;
        const date = new Date(tx.date);
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;

        // Category breakdown (only expenses)
        if (amount < 0) {
          const existing = categoryMap.get(categoryName) || {
            total: 0,
            color: COLORS[categoryMap.size % COLORS.length],
          };
          existing.total += Math.abs(amount);
          categoryMap.set(categoryName, existing);
        }

        // Monthly data
        const monthData = monthMap.get(monthKey) || { expenses: 0, income: 0 };
        if (amount < 0) {
          monthData.expenses += Math.abs(amount);
        } else {
          monthData.income += amount;
        }
        monthMap.set(monthKey, monthData);
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
        }))
        .slice(-6); // Last 6 months

      setCategoryData(catData);
      setMonthlyData(monthData);
    } catch (error) {
      console.error("Error fetching reports data:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto">
      <Card variant="glass" className="w-full max-w-5xl my-8">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-foreground">
            Financial Reports
          </h2>
          <Button
            onClick={onClose}
            variant="ghost"
            size="sm"
            className="text-muted hover:text-foreground text-2xl"
          >
            ✕
          </Button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="text-muted">Loading reports...</div>
          </div>
        ) : (
          <>
            {/* View Toggle */}
            <div className="flex gap-2 mb-6">
              <Button
                onClick={() => setView("category")}
                variant={view === "category" ? "primary" : "secondary"}
                className={`px-4 py-3 rounded-lg font-medium transition-all ${
                  view === "category"
                    ? "bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg border-none"
                    : "bg-surface text-muted hover:text-foreground border border-border"
                }`}
              >
                Category Breakdown
              </Button>
              <Button
                onClick={() => setView("monthly")}
                variant={view === "monthly" ? "primary" : "secondary"}
                className={`px-4 py-3 rounded-lg font-medium transition-all ${
                  view === "monthly"
                    ? "bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg border-none"
                    : "bg-surface text-muted hover:text-foreground border border-border"
                }`}
              >
                Monthly Trends
              </Button>
            </div>

            {/* Category Breakdown */}
            {view === "category" && (
              <div className="space-y-6">
                <div className="bg-surface-alt/50 p-6 rounded-xl border border-border">
                  <h3 className="text-lg font-medium text-foreground mb-4">
                    Spending by Category
                  </h3>
                  {categoryData.length > 0 ? (
                    <div className="grid md:grid-cols-2 gap-8">
                      {/* Pie Chart */}
                      <div className="flex items-center justify-center">
                        <ResponsiveContainer width="100%" height={300}>
                          <PieChart>
                            <Pie
                              data={categoryData}
                              cx="50%"
                              cy="50%"
                              labelLine={false}
                              label={(entry) =>
                                `${entry.name}: €${entry.value}`
                              }
                              outerRadius={100}
                              fill="#8884d8"
                              dataKey="value"
                            >
                              {categoryData.map((entry, index) => (
                                <Cell
                                  key={`cell-${index}`}
                                  fill={entry.color}
                                />
                              ))}
                            </Pie>
                            <Tooltip formatter={(value) => `€${value}`} />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>

                      {/* Bar Chart */}
                      <div>
                        <ResponsiveContainer width="100%" height={300}>
                          <BarChart data={categoryData}>
                            <CartesianGrid
                              strokeDasharray="3 3"
                              stroke="rgba(100, 116, 139, 0.2)"
                            />
                            <XAxis
                              dataKey="name"
                              tick={{
                                fill: "var(--text-secondary)",
                                fontSize: 12,
                              }}
                              angle={-45}
                              textAnchor="end"
                              height={100}
                            />
                            <YAxis tick={{ fill: "var(--text-secondary)" }} />
                            <Tooltip
                              formatter={(value) => `€${value}`}
                              contentStyle={{
                                backgroundColor: "var(--surface)",
                                border: "1px solid var(--border)",
                                color: "var(--foreground)",
                              }}
                            />
                            <Bar dataKey="value" fill="#3b82f6" />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  ) : (
                    <p className="text-muted text-center py-8">
                      No transaction data available
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Monthly Trends */}
            {view === "monthly" && (
              <div className="bg-surface-alt/50 p-6 rounded-xl border border-border">
                <h3 className="text-lg font-medium text-foreground mb-4">
                  Monthly Trends (Last 6 Months)
                </h3>
                {monthlyData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={400}>
                    <LineChart data={monthlyData}>
                      <CartesianGrid
                        strokeDasharray="3 3"
                        stroke="rgba(100, 116, 139, 0.2)"
                      />
                      <XAxis
                        dataKey="month"
                        tick={{ fill: "var(--text-secondary)" }}
                      />
                      <YAxis tick={{ fill: "var(--text-secondary)" }} />
                      <Tooltip
                        formatter={(value) => `€${value}`}
                        contentStyle={{
                          backgroundColor: "var(--surface)",
                          border: "1px solid var(--border)",
                          color: "var(--foreground)",
                        }}
                      />
                      <Legend />
                      <Line
                        type="monotone"
                        dataKey="expenses"
                        stroke="#ef4444"
                        strokeWidth={2}
                        name="Expenses"
                      />
                      <Line
                        type="monotone"
                        dataKey="income"
                        stroke="#10b981"
                        strokeWidth={2}
                        name="Income"
                      />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-white/70 text-center py-8">
                    No transaction data available
                  </p>
                )}
              </div>
            )}
          </>
        )}
      </Card>
    </div>
  );
}
