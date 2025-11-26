'use client'

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import NavBar from '@/components/NavBar'
import FileUpload from '@/components/FileUpload'
import AddAccountModal from '@/components/AddAccountModal'
import InvitePartnerModal from '@/components/InvitePartnerModal'
import TransactionsList from '@/components/TransactionsList'
import { Button } from '@/components/ui/Button'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import { Skeleton } from '@/components/ui/Skeleton'
import GoalsWidget from '@/components/dashboard/GoalsWidget'

import { createClient } from '@/utils/supabase/client'

interface DashboardStats {
  totalExpenses: number
  monthlyExpenses: number
  savings: number
  totalBudget: number
  budgetSpent: number
}

export default function DashboardPage() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const pathname = usePathname()
  const [showUpload, setShowUpload] = useState(false)
  const [showAccountModal, setShowAccountModal] = useState(false)
  const [showInviteModal, setShowInviteModal] = useState(false)
  const [stats, setStats] = useState<DashboardStats>({
    totalExpenses: 0,
    monthlyExpenses: 0,
    savings: 0,
    totalBudget: 0,
    budgetSpent: 0
  })

  useEffect(() => {
    if (!loading && !user) {
      router.push('/auth')
    } else if (user) {
      fetchDashboardData()
      // Trigger recurring transaction processing
      fetch('/api/recurring/process', { method: 'POST' })
        .then(res => res.json())
        .then(data => {
          if (data.processed > 0) {
            fetchDashboardData() // Refresh if new transactions were created
          }
        })
        .catch(err => console.error('Error processing recurring:', err))
    }
  }, [user, loading, router])

  const fetchDashboardData = async () => {
    try {
      const supabase = createClient()
      // Fetch transactions
      const { data: transactionsData, error: transactionsError } = await supabase
        .from('transactions')
        .select('amount, date')
      
      
      if (transactionsError) throw transactionsError

      const now = new Date()
      const currentMonth = now.getMonth()
      const currentYear = now.getFullYear()

      const newStats = (transactionsData || []).reduce((acc: any, curr: any) => {
        const amount = curr.amount
        const date = new Date(curr.date)
        
        // Total Expenses (negative amounts)
        if (amount < 0) {
          acc.totalExpenses += Math.abs(amount)
          
          // Monthly Expenses
          if (date.getMonth() === currentMonth && date.getFullYear() === currentYear) {
            acc.monthlyExpenses += Math.abs(amount)
          }
        }

        // Savings (Income - Expenses)
        acc.savings += amount

        return acc
      }, { totalExpenses: 0, monthlyExpenses: 0, savings: 0, totalBudget: 0, budgetSpent: 0 })

      // Fetch Budgets
      const { data: budgets } = await supabase
        .from('budgets')
        .select('amount')
      
      if (budgets) {
        newStats.totalBudget = budgets.reduce((sum, b) => sum + b.amount, 0)
        // We already calculated monthly expenses, which is essentially budget spent
        newStats.budgetSpent = newStats.monthlyExpenses
      }

      setStats(newStats)
    } catch (error) {
      console.error('Error fetching stats:', error)
    }
  }

  if (loading || !user) {
    return (
      <div className="min-h-screen bg-background">
        <NavBar />
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
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
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            <Card className="h-full">
              <CardContent className="pt-6">
                 <Skeleton variant="text" className="w-32 h-6 mb-4" />
                 <Skeleton variant="rectangle" className="w-full h-4 rounded-full" />
              </CardContent>
            </Card>
            <Card className="h-full">
               <CardContent className="pt-6">
                 <Skeleton variant="text" className="w-32 h-6 mb-4" />
                 <Skeleton variant="rectangle" className="w-full h-32 rounded-lg" />
               </CardContent>
            </Card>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div key={pathname} className="min-h-screen bg-background">
      <NavBar />

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardContent>
              <div className="text-muted text-sm font-medium mb-2">Total Expenses</div>
              <div className="text-3xl font-bold text-foreground">
                €{stats.totalExpenses.toFixed(2)}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent>
              <div className="text-muted text-sm font-medium mb-2">This Month</div>
              <div className="text-3xl font-bold text-foreground">
                €{stats.monthlyExpenses.toFixed(2)}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent>
              <div className="text-muted text-sm font-medium mb-2">Savings</div>
              <div className={`text-3xl font-bold ${stats.savings >= 0 ? 'text-success' : 'text-red-500'}`}>
                €{stats.savings.toFixed(2)}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Budget Overview */}
          <Card className="h-full">
            <CardContent className="pt-6">
              <div className="flex justify-between items-end mb-4">
                <div>
                  <h2 className="text-lg font-semibold text-foreground">Monthly Budget</h2>
                  <div className="text-3xl font-bold text-foreground mt-1">
                    €{stats.budgetSpent.toFixed(2)} <span className="text-muted text-lg font-normal">/ €{stats.totalBudget.toFixed(2)}</span>
                  </div>
                </div>
                <div className="text-right">
                  <div className={`text-lg font-bold ${stats.budgetSpent > stats.totalBudget ? 'text-danger' : 'text-success'}`}>
                    {stats.totalBudget > 0 ? ((stats.budgetSpent / stats.totalBudget) * 100).toFixed(0) : 0}%
                  </div>
                  <div className="text-sm text-muted">Used</div>
                </div>
              </div>
              <div className="h-4 bg-surface-alt rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all duration-500 ${stats.budgetSpent > stats.totalBudget ? 'bg-danger' : 'bg-success'}`}
                  style={{ width: `${stats.totalBudget > 0 ? Math.min((stats.budgetSpent / stats.totalBudget) * 100, 100) : 0}%` }}
                />
              </div>
            </CardContent>
          </Card>

          {/* Goals Widget */}
          <GoalsWidget />
        </div>

        {/* Quick Actions */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent>
            {showUpload ? (
              <div className="bg-background p-6 rounded-xl border border-border">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-foreground font-medium">Upload Bank Statement</h3>
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
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <Button onClick={() => setShowUpload(true)}>
                  Upload Statement
                </Button>
                <Button variant="secondary" onClick={() => setShowAccountModal(true)}>
                  Add Account
                </Button>
                <Button variant="secondary" onClick={() => setShowInviteModal(true)}>
                  Invite Partner
                </Button>
                <Button variant="secondary" onClick={() => router.push('/reports')}>
                  View Reports
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Transactions */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Transactions</CardTitle>
          </CardHeader>
          <CardContent>
            <TransactionsList />
          </CardContent>
        </Card>
      </main>

      {/* Modals */}
      {showAccountModal && (
        <AddAccountModal
          onClose={() => setShowAccountModal(false)}
          onSuccess={() => {
            // Refresh accounts list when implemented
            console.log('Account created successfully!')
          }}
        />
      )}
      {showInviteModal && (
        <InvitePartnerModal onClose={() => setShowInviteModal(false)} />
      )}
    </div>
  )
}
