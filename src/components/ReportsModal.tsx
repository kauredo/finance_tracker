'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Card } from '@/components/ui/Card'
import { PieChart, Pie, Cell, BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'

interface ReportsModalProps {
  onClose: () => void
}

interface CategoryData {
  name: string
  value: number
  color: string
  [key: string]: string | number
}

interface MonthlyData {
  month: string
  expenses: number
  income: number
}

const COLORS = [
  '#3b82f6', // blue
  '#ef4444', // red
  '#10b981', // green
  '#f59e0b', // amber
  '#8b5cf6', // purple
  '#ec4899', // pink
  '#06b6d4', // cyan
  '#f97316', // orange
]

export default function ReportsModal({ onClose }: ReportsModalProps) {
  const [categoryData, setCategoryData] = useState<CategoryData[]>([])
  const [monthlyData, setMonthlyData] = useState<MonthlyData[]>([])
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState<'category' | 'monthly'>('category')

  useEffect(() => {
    fetchReportsData()
  }, [])

  const fetchReportsData = async () => {
    try {
      setLoading(true)
      
      // Fetch transactions with categories
      const { data: transactions, error } = await supabase
        .from('transactions')
        .select('amount, date, category_id, categories(name)')
        .order('date', { ascending: true })

      if (error) throw error

      // Process category data
      const categoryMap = new Map<string, { total: number; color: string }>()
      const monthMap = new Map<string, { expenses: number; income: number }>()

      transactions?.forEach((tx, index) => {
        const categoryName = (tx.categories as any)?.name || 'Other'
        const amount = tx.amount
        const date = new Date(tx.date)
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`

        // Category breakdown (only expenses)
        if (amount < 0) {
          const existing = categoryMap.get(categoryName) || { total: 0, color: COLORS[categoryMap.size % COLORS.length] }
          existing.total += Math.abs(amount)
          categoryMap.set(categoryName, existing)
        }

        // Monthly data
        const monthData = monthMap.get(monthKey) || { expenses: 0, income: 0 }
        if (amount < 0) {
          monthData.expenses += Math.abs(amount)
        } else {
          monthData.income += amount
        }
        monthMap.set(monthKey, monthData)
      })

      // Convert to chart data
      const catData: CategoryData[] = Array.from(categoryMap.entries())
        .map(([name, data]) => ({
          name,
          value: parseFloat(data.total.toFixed(2)),
          color: data.color
        }))
        .sort((a, b) => b.value - a.value)

      const monthData: MonthlyData[] = Array.from(monthMap.entries())
        .map(([month, data]) => ({
          month: new Date(month + '-01').toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
          expenses: parseFloat(data.expenses.toFixed(2)),
          income: parseFloat(data.income.toFixed(2))
        }))
        .slice(-6) // Last 6 months

      setCategoryData(catData)
      setMonthlyData(monthData)
    } catch (error) {
      console.error('Error fetching reports data:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto">
      <Card variant="glass" className="w-full max-w-5xl my-8">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-white">Financial Reports</h2>
          <button
            onClick={onClose}
            className="text-white/60 hover:text-white text-2xl"
          >
            ✕
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="text-white/70">Loading reports...</div>
          </div>
        ) : (
          <>
            {/* View Toggle */}
            <div className="flex gap-2 mb-6">
              <button
                onClick={() => setView('category')}
                className={`px-4 py-3 rounded-lg font-medium transition-all ${
                  view === 'category'
                    ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg'
                    : 'bg-white/10 text-white/70 hover:text-white border border-white/20'
                }`}
              >
                Category Breakdown
              </button>
              <button
                onClick={() => setView('monthly')}
                className={`px-4 py-3 rounded-lg font-medium transition-all ${
                  view === 'monthly'
                    ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg'
                    : 'bg-white/10 text-white/70 hover:text-white border border-white/20'
                }`}
              >
                Monthly Trends
              </button>
            </div>

            {/* Category Breakdown */}
            {view === 'category' && (
              <div className="space-y-6">
                <div className="bg-white/5 p-6 rounded-xl border border-white/10">
                  <h3 className="text-lg font-medium text-white mb-4">Spending by Category</h3>
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
                                label={(entry) => `${entry.name}: €${entry.value}`}
                                outerRadius={100}
                                fill="#8884d8"
                                dataKey="value"
                              >
                                {categoryData.map((entry, index) => (
                                  <Cell key={`cell-${index}`} fill={entry.color} />
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
                              <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                              <XAxis dataKey="name" tick={{ fill: '#999', fontSize: 12 }} angle={-45} textAnchor="end" height={100} />
                              <YAxis tick={{ fill: '#999' }} />
                              <Tooltip formatter={(value) => `€${value}`} contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid #333' }} />
                              <Bar dataKey="value" fill="#3b82f6" />
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                      </div>
                  ) : (
                    <p className="text-white/70 text-center py-8">No transaction data available</p>
                  )}
                  </div>
                </div>
              )}

            {/* Monthly Trends */}
            {view === 'monthly' && (
              <div className="bg-white/5 p-6 rounded-xl border border-white/10">
                <h3 className="text-lg font-medium text-white mb-4">Monthly Trends (Last 6 Months)</h3>
                  {monthlyData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={400}>
                      <LineChart data={monthlyData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                        <XAxis dataKey="month" tick={{ fill: '#999' }} />
                        <YAxis tick={{ fill: '#999' }} />
                        <Tooltip formatter={(value) => `€${value}`} contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid #333' }} />
                        <Legend />
                        <Line type="monotone" dataKey="expenses" stroke="#ef4444" strokeWidth={2} name="Expenses" />
                        <Line type="monotone" dataKey="income" stroke="#10b981" strokeWidth={2} name="Income" />
                      </LineChart>
                    </ResponsiveContainer>
                ) : (
                  <p className="text-white/70 text-center py-8">No transaction data available</p>
                )}
              </div>
            )}
          </>
        )}
      </Card>
    </div>
  )
}
