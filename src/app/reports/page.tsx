'use client'

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import NavBar from '@/components/NavBar'
import { createClient } from '@/utils/supabase/client'
import ReportsCharts from '@/components/reports/ReportsCharts'
import { Card } from '@/components/ui/Card'
import Icon from '@/components/icons/Icon'

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

export default function ReportsPage() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  const pathname = usePathname()
  
  const [loading, setLoading] = useState(true)
  const [categoryData, setCategoryData] = useState<CategoryData[]>([])
  const [monthlyData, setMonthlyData] = useState<MonthlyData[]>([])
  const [summary, setSummary] = useState({
    totalIncome: 0,
    totalExpenses: 0,
    netSavings: 0,
    savingsRate: 0
  })

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/auth')
    } else if (user) {
      fetchReportsData()
    }
  }, [user, authLoading, router])

  const fetchReportsData = async () => {
    try {
      setLoading(true)
      const supabase = createClient()
      
      // Fetch transactions with categories
      const { data: transactions, error } = await supabase
        .from('transactions')
        .select('amount, date, category_id, categories(name)')
        .order('date', { ascending: true })

      if (error) throw error

      // Process category data
      const categoryMap = new Map<string, { total: number; color: string }>()
      const monthMap = new Map<string, { expenses: number; income: number }>()
      
      let totalIncome = 0
      let totalExpenses = 0

      transactions?.forEach((tx) => {
        const categoryName = (tx.categories as any)?.name || 'Other'
        const amount = tx.amount
        const date = new Date(tx.date)
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`

        // Category breakdown (only expenses)
        if (amount < 0) {
          const absAmount = Math.abs(amount)
          totalExpenses += absAmount
          
          const existing = categoryMap.get(categoryName) || { total: 0, color: COLORS[categoryMap.size % COLORS.length] }
          existing.total += absAmount
          categoryMap.set(categoryName, existing)
          
          // Monthly expenses
          const monthData = monthMap.get(monthKey) || { expenses: 0, income: 0 }
          monthData.expenses += absAmount
          monthMap.set(monthKey, monthData)
        } else {
          totalIncome += amount
          
          // Monthly income
          const monthData = monthMap.get(monthKey) || { expenses: 0, income: 0 }
          monthData.income += amount
          monthMap.set(monthKey, monthData)
        }
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
          income: parseFloat(data.income.toFixed(2)),
          rawDate: month // for sorting
        }))
        .sort((a, b) => a.rawDate.localeCompare(b.rawDate))
        .slice(-6) // Last 6 months

      setCategoryData(catData)
      setMonthlyData(monthData)
      
      const netSavings = totalIncome - totalExpenses
      const savingsRate = totalIncome > 0 ? (netSavings / totalIncome) * 100 : 0
      
      setSummary({
        totalIncome,
        totalExpenses,
        netSavings,
        savingsRate
      })

    } catch (error) {
      console.error('Error fetching reports data:', error)
    } finally {
      setLoading(false)
    }
  }

  if (authLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-muted">Loading...</div>
      </div>
    )
  }

  return (
    <div key={pathname} className="min-h-screen bg-background">
      <NavBar />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground">Financial Reports</h1>
          <p className="text-muted mt-1">Analyze your spending patterns and trends</p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="text-muted">Loading reports...</div>
          </div>
        ) : (
          <>
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
              <Card className="p-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-success/10 rounded-xl text-success">
                    <Icon name="income" size={24} />
                  </div>
                  <div>
                    <p className="text-sm text-muted font-medium">Total Income</p>
                    <p className="text-2xl font-bold text-foreground">€{summary.totalIncome.toLocaleString()}</p>
                  </div>
                </div>
              </Card>
              
              <Card className="p-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-danger/10 rounded-xl text-danger">
                    <Icon name="expense" size={24} />
                  </div>
                  <div>
                    <p className="text-sm text-muted font-medium">Total Expenses</p>
                    <p className="text-2xl font-bold text-foreground">€{summary.totalExpenses.toLocaleString()}</p>
                  </div>
                </div>
              </Card>
              
              <Card className="p-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-primary/10 rounded-xl text-primary">
                    <Icon name="savings" size={24} />
                  </div>
                  <div>
                    <p className="text-sm text-muted font-medium">Net Savings</p>
                    <p className={`text-2xl font-bold ${summary.netSavings >= 0 ? 'text-success' : 'text-danger'}`}>
                      €{summary.netSavings.toLocaleString()}
                    </p>
                  </div>
                </div>
              </Card>

              <Card className="p-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-purple-500/10 rounded-xl text-purple-500">
                    <Icon name="chart" size={24} />
                  </div>
                  <div>
                    <p className="text-sm text-muted font-medium">Savings Rate</p>
                    <p className={`text-2xl font-bold ${summary.savingsRate >= 20 ? 'text-success' : summary.savingsRate > 0 ? 'text-primary' : 'text-danger'}`}>
                      {summary.savingsRate.toFixed(1)}%
                    </p>
                  </div>
                </div>
              </Card>
            </div>

            {/* Charts */}
            <ReportsCharts categoryData={categoryData} monthlyData={monthlyData} />
          </>
        )}
      </main>
    </div>
  )
}
