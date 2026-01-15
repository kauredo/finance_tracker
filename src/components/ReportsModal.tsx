"use client";

import { useMemo, useState } from "react";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Button } from "@/components/ui/Button";
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalTitle,
  ModalBody,
} from "@/components/ui/Modal";
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
  const [view, setView] = useState<"category" | "monthly">("category");

  // Fetch all transactions from Convex
  const transactionsData = useQuery(api.transactions.list, { limit: 1000 });
  const loading = transactionsData === undefined;

  // Process data for charts
  const { categoryData, monthlyData } = useMemo(() => {
    if (!transactionsData?.transactions) {
      return { categoryData: [], monthlyData: [] };
    }

    const categoryMap = new Map<string, { total: number; color: string }>();
    const monthMap = new Map<string, { expenses: number; income: number }>();

    transactionsData.transactions.forEach((tx) => {
      const categoryName = tx.category?.name || "Other";
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
        rawDate: month,
      }))
      .sort((a: any, b: any) => a.rawDate.localeCompare(b.rawDate))
      .slice(-6); // Last 6 months

    return { categoryData: catData, monthlyData: monthData };
  }, [transactionsData]);

  return (
    <Modal open={true} onOpenChange={(open) => !open && onClose()}>
      <ModalContent size="xl">
        <ModalHeader>
          <ModalTitle>Financial Reports</ModalTitle>
        </ModalHeader>

        <ModalBody>
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="text-text-secondary">Loading reports...</div>
            </div>
          ) : (
            <>
              {/* View Toggle */}
              <div className="flex gap-2 mb-6">
                <Button
                  onClick={() => setView("category")}
                  variant={view === "category" ? "bloom" : "secondary"}
                >
                  Category Breakdown
                </Button>
                <Button
                  onClick={() => setView("monthly")}
                  variant={view === "monthly" ? "bloom" : "secondary"}
                >
                  Monthly Trends
                </Button>
              </div>

              {/* Category Breakdown */}
              {view === "category" && (
                <div className="space-y-6">
                  <div className="bg-sand/50 p-6 rounded-2xl border border-border">
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
                              <Bar dataKey="value" fill="var(--primary)" />
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                      </div>
                    ) : (
                      <p className="text-text-secondary text-center py-8">
                        No transaction data available
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Monthly Trends */}
              {view === "monthly" && (
                <div className="bg-sand/50 p-6 rounded-2xl border border-border">
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
                          stroke="var(--expense)"
                          strokeWidth={2}
                          name="Expenses"
                        />
                        <Line
                          type="monotone"
                          dataKey="income"
                          stroke="var(--growth)"
                          strokeWidth={2}
                          name="Income"
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  ) : (
                    <p className="text-text-secondary text-center py-8">
                      No transaction data available
                    </p>
                  )}
                </div>
              )}
            </>
          )}
        </ModalBody>
      </ModalContent>
    </Modal>
  );
}
