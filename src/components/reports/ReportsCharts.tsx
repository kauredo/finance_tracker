"use client";

import { useState } from "react";
import {
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Area,
  AreaChart,
} from "recharts";
import { Card, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import Icon from "@/components/icons/Icon";
import { motion, AnimatePresence } from "motion/react";
import { useCurrency } from "@/hooks/useCurrency";
import SpendingHeatmap from "./SpendingHeatmap";

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

interface ReportsChartsProps {
  categoryData: CategoryData[];
  monthlyData: MonthlyData[];
  rawTransactions?: { date: string; amount: number }[];
}

// Custom tooltip styles matching our theme
const CustomTooltip = ({ active, payload, label }: any) => {
  const { formatAmount } = useCurrency();
  if (active && payload && payload.length) {
    return (
      <div className="bg-surface border border-border rounded-xl p-3 shadow-lg">
        <p className="text-sm font-medium text-foreground mb-1">{label}</p>
        {payload.map((entry: any, index: number) => (
          <p key={index} className="text-sm" style={{ color: entry.color }}>
            {entry.name}:{" "}
            <span className="font-bold tabular-nums">
              {formatAmount(Number(entry.value))}
            </span>
          </p>
        ))}
      </div>
    );
  }
  return null;
};

const PieTooltip = ({ active, payload }: any) => {
  const { formatAmount } = useCurrency();
  if (active && payload && payload.length) {
    const data = payload[0];
    return (
      <div className="bg-surface border border-border rounded-xl p-3 shadow-lg">
        <p className="text-sm font-medium text-foreground">{data.name}</p>
        <p
          className="text-sm font-bold tabular-nums"
          style={{ color: data.payload.color }}
        >
          {formatAmount(Number(data.value))}
        </p>
      </div>
    );
  }
  return null;
};

export default function ReportsCharts({
  categoryData,
  monthlyData,
  rawTransactions,
}: ReportsChartsProps) {
  const { formatAmount } = useCurrency();
  const [view, setView] = useState<"category" | "monthly" | "heatmap">(
    "category",
  );

  return (
    <div className="space-y-6">
      {/* View Toggle */}
      <div className="flex gap-2 p-1 bg-sand/50 rounded-2xl w-fit">
        <Button
          onClick={() => setView("category")}
          variant={view === "category" ? "primary" : "ghost"}
          size="sm"
          className={`rounded-xl transition-all ${
            view === "category"
              ? ""
              : "text-text-secondary hover:text-foreground"
          }`}
        >
          <Icon name="chart" size={16} />
          Category Breakdown
        </Button>
        <Button
          onClick={() => setView("monthly")}
          variant={view === "monthly" ? "primary" : "ghost"}
          size="sm"
          className={`rounded-xl transition-all ${
            view === "monthly"
              ? ""
              : "text-text-secondary hover:text-foreground"
          }`}
        >
          <Icon name="trending_up" size={16} />
          Monthly Trends
        </Button>
        {rawTransactions && rawTransactions.length > 0 && (
          <Button
            onClick={() => setView("heatmap")}
            variant={view === "heatmap" ? "primary" : "ghost"}
            size="sm"
            className={`rounded-xl transition-all ${
              view === "heatmap"
                ? ""
                : "text-text-secondary hover:text-foreground"
            }`}
          >
            <Icon name="calendar" size={16} />
            Daily Activity
          </Button>
        )}
      </div>

      <AnimatePresence mode="wait">
        {/* Category Breakdown */}
        {view === "category" && (
          <motion.div
            key="category"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            transition={{ duration: 0.2 }}
            className="grid md:grid-cols-2 gap-6"
          >
            {/* Pie Chart */}
            <Card>
              <CardContent className="p-6">
                <h3 className="text-lg font-display font-bold text-foreground mb-4 flex items-center gap-2">
                  <span className="text-xl">🥧</span>
                  Expense Distribution
                </h3>
                {categoryData.length > 0 ? (
                  <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={categoryData}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          outerRadius={100}
                          innerRadius={50}
                          fill="#8884d8"
                          dataKey="value"
                          paddingAngle={2}
                        >
                          {categoryData.map((entry, index) => (
                            <Cell
                              key={`cell-${index}`}
                              fill={entry.color}
                              stroke="transparent"
                            />
                          ))}
                        </Pie>
                        <Tooltip content={<PieTooltip />} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div className="h-[300px] flex items-center justify-center text-text-secondary">
                    No expense data available
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Category List */}
            <Card>
              <CardContent className="p-6">
                <h3 className="text-lg font-display font-bold text-foreground mb-4 flex items-center gap-2">
                  <span className="text-xl">🏆</span>
                  Top Categories
                </h3>
                {categoryData.length > 0 ? (
                  <div className="space-y-3">
                    {categoryData.slice(0, 6).map((category, index) => {
                      const total = categoryData.reduce(
                        (sum, c) => sum + c.value,
                        0,
                      );
                      const percentage = (category.value / total) * 100;

                      return (
                        <motion.div
                          key={category.name}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: index * 0.05 }}
                          className="flex items-center gap-3"
                        >
                          <div
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: category.color }}
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex justify-between items-center mb-1">
                              <span className="text-sm font-medium text-foreground truncate">
                                {category.name}
                              </span>
                              <span className="text-sm text-foreground tabular-nums">
                                {formatAmount(category.value)}
                              </span>
                            </div>
                            <div className="h-2 bg-sand rounded-full overflow-hidden">
                              <motion.div
                                className="h-full rounded-full"
                                style={{ backgroundColor: category.color }}
                                initial={{ width: 0 }}
                                animate={{ width: `${percentage}%` }}
                                transition={{
                                  duration: 0.5,
                                  delay: index * 0.05,
                                }}
                              />
                            </div>
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="h-[300px] flex items-center justify-center text-text-secondary">
                    No expense data available
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Monthly Trends */}
        {view === "monthly" && (
          <motion.div
            key="monthly"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
          >
            <Card>
              <CardContent className="p-6">
                <h3 className="text-lg font-display font-bold text-foreground mb-4 flex items-center gap-2">
                  <span className="text-xl">📈</span>
                  Income vs Expenses (Last 6 Months)
                </h3>
                {monthlyData.length > 0 ? (
                  <div className="h-[400px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={monthlyData}>
                        <defs>
                          <linearGradient
                            id="colorIncome"
                            x1="0"
                            y1="0"
                            x2="0"
                            y2="1"
                          >
                            <stop
                              offset="5%"
                              stopColor="#7cb482"
                              stopOpacity={0.3}
                            />
                            <stop
                              offset="95%"
                              stopColor="#7cb482"
                              stopOpacity={0}
                            />
                          </linearGradient>
                          <linearGradient
                            id="colorExpenses"
                            x1="0"
                            y1="0"
                            x2="0"
                            y2="1"
                          >
                            <stop
                              offset="5%"
                              stopColor="#e57373"
                              stopOpacity={0.3}
                            />
                            <stop
                              offset="95%"
                              stopColor="#e57373"
                              stopOpacity={0}
                            />
                          </linearGradient>
                        </defs>
                        <CartesianGrid
                          strokeDasharray="3 3"
                          stroke="var(--border)"
                          vertical={false}
                        />
                        <XAxis
                          dataKey="month"
                          tick={{ fill: "var(--text-secondary)", fontSize: 12 }}
                          axisLine={false}
                          tickLine={false}
                        />
                        <YAxis
                          tick={{ fill: "var(--text-secondary)", fontSize: 12 }}
                          axisLine={false}
                          tickLine={false}
                          tickFormatter={(value) => formatAmount(Number(value))}
                        />
                        <Tooltip content={<CustomTooltip />} />
                        <Legend
                          wrapperStyle={{ paddingTop: 20 }}
                          formatter={(value) => (
                            <span className="text-sm text-foreground">
                              {value}
                            </span>
                          )}
                        />
                        <Area
                          type="monotone"
                          dataKey="income"
                          stroke="#7cb482"
                          strokeWidth={3}
                          fillOpacity={1}
                          fill="url(#colorIncome)"
                          name="Income"
                        />
                        <Area
                          type="monotone"
                          dataKey="expenses"
                          stroke="#e57373"
                          strokeWidth={3}
                          fillOpacity={1}
                          fill="url(#colorExpenses)"
                          name="Expenses"
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div className="h-[400px] flex items-center justify-center text-text-secondary">
                    No transaction data available
                  </div>
                )}

                {/* Monthly Summary */}
                {monthlyData.length > 0 && (
                  <div className="mt-6 pt-6 border-t border-border">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      {monthlyData.slice(-4).map((month, index, arr) => {
                        const net = month.income - month.expenses;
                        // Get the previous month for comparison
                        const allMonths = monthlyData;
                        const currentIdx = allMonths.indexOf(
                          allMonths.slice(-4)[index],
                        );
                        const prevMonth =
                          currentIdx > 0 ? allMonths[currentIdx - 1] : null;
                        const prevNet = prevMonth
                          ? prevMonth.income - prevMonth.expenses
                          : null;
                        const change =
                          prevNet !== null ? net - prevNet : null;

                        return (
                          <motion.div
                            key={month.month}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.1 }}
                            className="text-center p-3 bg-sand/30 rounded-xl"
                          >
                            <p className="text-xs text-text-secondary mb-1">
                              {month.month}
                            </p>
                            <p
                              className={`font-bold tabular-nums ${net >= 0 ? "text-growth" : "text-expense"}`}
                            >
                              {net >= 0 ? "+" : ""}
                              {formatAmount(Math.abs(net))}
                            </p>
                            {change !== null && (
                              <p
                                className={`text-[10px] mt-0.5 ${change >= 0 ? "text-growth" : "text-expense"}`}
                              >
                                {change >= 0 ? "↑" : "↓"}{" "}
                                {formatAmount(Math.abs(change))}
                              </p>
                            )}
                          </motion.div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        )}
        {/* Spending Heatmap */}
        {view === "heatmap" && rawTransactions && (
          <motion.div
            key="heatmap"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
          >
            <Card>
              <CardContent className="p-6">
                <h3 className="text-lg font-display font-bold text-foreground mb-4 flex items-center gap-2">
                  <span className="text-xl">🗓️</span>
                  Daily Spending (Last 3 Months)
                </h3>
                <SpendingHeatmap transactions={rawTransactions} />
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
