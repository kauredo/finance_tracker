'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import NavBar from '@/components/NavBar'
import BudgetCard from '@/components/BudgetCard'
import { createClient } from '@/utils/supabase/client'
import { startOfMonth, endOfMonth, format } from 'date-fns'

interface Category {
  id: string
  name: string
  icon: string
  color: string
}

interface Budget {
  id: string
  category_id: string
  amount: number
  period: string
}

interface Transaction {
  amount: number
  category_id: string
  type: string // 'income' | 'expense' (derived)
}

export default function BudgetsPage() {
  const { user, loading: authLoading } = useAuth()
  const [categories, setCategories] = useState<Category[]>([])
  const [budgets, setBudgets] = useState<Budget[]>([])
  const [spending, setSpending] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (user) {
      fetchData()
    }
  }, [user])

  const fetchData = async () => {
    setLoading(true)
    try {
      const supabase = createClient()
      
      // 1. Fetch Categories
      const { data: cats } = await supabase
        .from('categories')
        .select('*')
        .order('name')
      
      if (cats) setCategories(cats)

      // 2. Fetch Budgets via API
      const budgetRes = await fetch('/api/budgets')
      const budgetData = await budgetRes.json()
      if (budgetData.budgets) setBudgets(budgetData.budgets)

      // 3. Fetch Current Month Spending
      const start = startOfMonth(new Date()).toISOString()
      const end = endOfMonth(new Date()).toISOString()

      const { data: transactions } = await supabase
        .from('transactions')
        .select('amount, category_id')
        .gte('date', start)
        .lte('date', end)

      // Calculate spending per category (only expenses, so negative amounts)
      const spendMap: Record<string, number> = {}
      transactions?.forEach((t: any) => {
        if (t.category_id && parseFloat(t.amount) < 0) {
          const amount = Math.abs(parseFloat(t.amount))
          spendMap[t.category_id] = (spendMap[t.category_id] || 0) + amount
        }
      })
      setSpending(spendMap)

    } catch (error) {
      console.error('Error fetching budget data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSaveBudget = async (categoryId: string, amount: number) => {
    try {
      const res = await fetch('/api/budgets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ category_id: categoryId, amount })
      })
      
      if (res.ok) {
        fetchData() // Refresh data
      }
    } catch (error) {
      console.error('Error saving budget:', error)
    }
  }

  const handleDeleteBudget = async (budgetId: string) => {
    try {
      const res = await fetch(`/api/budgets/${budgetId}`, {
        method: 'DELETE'
      })
      
      if (res.ok) {
        fetchData() // Refresh data
      }
    } catch (error) {
      console.error('Error deleting budget:', error)
    }
  }

  if (authLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-muted">Loading...</div>
      </div>
    )
  }

  // Sort categories: Active budgets first, then alphabetical
  const sortedCategories = [...categories].sort((a, b) => {
    const hasBudgetA = budgets.some(bg => bg.category_id === a.id)
    const hasBudgetB = budgets.some(bg => bg.category_id === b.id)
    if (hasBudgetA && !hasBudgetB) return -1
    if (!hasBudgetA && hasBudgetB) return 1
    return a.name.localeCompare(b.name)
  })

  const totalBudget = budgets.reduce((sum, b) => sum + b.amount, 0)
  const totalSpent = Object.values(spending).reduce((sum, val) => sum + val, 0)
  const totalProgress = totalBudget > 0 ? Math.min((totalSpent / totalBudget) * 100, 100) : 0

  return (
    <>
      <NavBar />
      <div className="min-h-screen bg-background p-6">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-4xl font-bold text-foreground mb-2">
              Monthly Budgets
            </h1>
            <p className="text-muted">
              Set limits and track your spending for {format(new Date(), 'MMMM yyyy')}
            </p>
          </div>

          {/* Summary Card */}
          <div className="bg-surface border border-border rounded-xl p-6 mb-8 shadow-sm">
            <div className="flex justify-between items-end mb-4">
              <div>
                <h2 className="text-lg font-semibold text-foreground">Total Budget</h2>
                <div className="text-3xl font-bold text-foreground mt-1">
                  €{totalSpent.toFixed(2)} <span className="text-muted text-lg font-normal">/ €{totalBudget.toFixed(2)}</span>
                </div>
              </div>
              <div className="text-right">
                <div className={`text-lg font-bold ${totalSpent > totalBudget ? 'text-danger' : 'text-success'}`}>
                  {totalBudget > 0 ? ((totalSpent / totalBudget) * 100).toFixed(0) : 0}%
                </div>
                <div className="text-sm text-muted">Used</div>
              </div>
            </div>
            <div className="h-4 bg-surface-alt rounded-full overflow-hidden">
              <div
                className={`h-full transition-all duration-500 ${totalSpent > totalBudget ? 'bg-danger' : 'bg-success'}`}
                style={{ width: `${totalProgress}%` }}
              />
            </div>
          </div>

          {/* Budget Grid */}
          {loading ? (
            <div className="text-center py-12 text-muted">Loading budgets...</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {sortedCategories.map(category => {
                const budget = budgets.find(b => b.category_id === category.id)
                const spent = spending[category.id] || 0
                
                return (
                  <BudgetCard
                    key={category.id}
                    category={category}
                    budget={budget}
                    spent={spent}
                    onSave={(amount) => handleSaveBudget(category.id, amount)}
                    onDelete={() => handleDeleteBudget(budget!.id)}
                  />
                )
              })}
            </div>
          )}
        </div>
      </div>
    </>
  )
}
