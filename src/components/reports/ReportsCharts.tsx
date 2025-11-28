"use client";

import { useState, useEffect } from "react";
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
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

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

export default function ReportsCharts({
  categoryData,
  monthlyData,
}: ReportsChartsProps) {
  const [view, setView] = useState<"category" | "monthly">("category");

  return (
    <div className="space-y-6">
      {/* View Toggle */}
      <div className="flex gap-2 mb-6">
        <Button
          onClick={() => setView("category")}
          variant={view === "category" ? "primary" : "secondary"}
          className={`px-4 py-2 rounded-lg font-medium transition-all ${
            view === "category"
              ? "bg-primary text-white shadow-lg border-none"
              : "bg-surface text-muted hover:text-foreground border border-border"
          }`}
        >
          Category Breakdown
        </Button>
        <Button
          onClick={() => setView("monthly")}
          variant={view === "monthly" ? "primary" : "secondary"}
          className={`px-4 py-2 rounded-lg font-medium transition-all ${
            view === "monthly"
              ? "bg-primary text-white shadow-lg border-none"
              : "bg-surface text-muted hover:text-foreground border border-border"
          }`}
        >
          Monthly Trends
        </Button>
      </div>

      {/* Category Breakdown */}
      {view === "category" && (
        <div className="grid md:grid-cols-2 gap-6">
          <Card className="p-6">
            <h3 className="text-lg font-medium text-foreground mb-4">
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
                      label={(entry) => `${entry.name}`}
                      outerRadius={100}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {categoryData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value: number) => `€${value.toFixed(2)}`}
                      contentStyle={{
                        backgroundColor: "var(--surface)",
                        borderColor: "var(--border)",
                        color: "var(--foreground)",
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-muted">
                No expense data available
              </div>
            )}
          </Card>

          <Card className="p-6">
            <h3 className="text-lg font-medium text-foreground mb-4">
              Top Categories
            </h3>
            {categoryData.length > 0 ? (
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={categoryData.slice(0, 5)} layout="vertical">
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="rgba(100, 116, 139, 0.2)"
                      horizontal={false}
                    />
                    <XAxis type="number" hide />
                    <YAxis
                      dataKey="name"
                      type="category"
                      width={100}
                      tick={{ fill: "var(--text-secondary)", fontSize: 12 }}
                    />
                    <Tooltip
                      formatter={(value: number) => `€${value.toFixed(2)}`}
                      contentStyle={{
                        backgroundColor: "var(--surface)",
                        borderColor: "var(--border)",
                        color: "var(--foreground)",
                      }}
                      cursor={{ fill: "var(--surface-alt)" }}
                    />
                    <Bar dataKey="value" fill="#3b82f6" radius={[0, 4, 4, 0]}>
                      {categoryData.slice(0, 5).map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-muted">
                No expense data available
              </div>
            )}
          </Card>
        </div>
      )}

      {/* Monthly Trends */}
      {view === "monthly" && (
        <Card className="p-6">
          <h3 className="text-lg font-medium text-foreground mb-4">
            Income vs Expenses (Last 6 Months)
          </h3>
          {monthlyData.length > 0 ? (
            <div className="h-[400px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={monthlyData}>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="rgba(100, 116, 139, 0.2)"
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
                    tickFormatter={(value) => `€${value}`}
                  />
                  <Tooltip
                    formatter={(value: number) => `€${value.toFixed(2)}`}
                    contentStyle={{
                      backgroundColor: "var(--surface)",
                      borderColor: "var(--border)",
                      color: "var(--foreground)",
                    }}
                  />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="income"
                    stroke="#10b981"
                    strokeWidth={3}
                    dot={{ r: 4, fill: "#10b981" }}
                    activeDot={{ r: 6 }}
                    name="Income"
                  />
                  <Line
                    type="monotone"
                    dataKey="expenses"
                    stroke="#ef4444"
                    strokeWidth={3}
                    dot={{ r: 4, fill: "#ef4444" }}
                    activeDot={{ r: 6 }}
                    name="Expenses"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-[400px] flex items-center justify-center text-muted">
              No transaction data available
            </div>
          )}
        </Card>
      )}
    </div>
  );
}
