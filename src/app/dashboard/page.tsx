'use client'

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import NavBar from '@/components/NavBar'
import FileUpload from '@/components/FileUpload'
import AddAccountModal from '@/components/AddAccountModal'
import InvitePartnerModal from '@/components/InvitePartnerModal'
import ReportsModal from '@/components/ReportsModal'
import TransactionsList from '@/components/TransactionsList'
import { Button } from '@/components/ui/Button'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'

import { supabase } from '@/lib/supabase'

interface DashboardStats {
  totalExpenses: number
  monthlyExpenses: number
  savings: number
}

export default function DashboardPage() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const pathname = usePathname()
  const [showUpload, setShowUpload] = useState(false)
  const [showAccountModal, setShowAccountModal] = useState(false)
  const [showInviteModal, setShowInviteModal] = useState(false)
  const [showReportsModal, setShowReportsModal] = useState(false)
  const [stats, setStats] = useState<DashboardStats>({
    totalExpenses: 0,
    monthlyExpenses: 0,
    savings: 0
  })

  useEffect(() => {
    if (!loading && !user) {
      router.push('/auth')
    } else if (user) {
      fetchStats()
    }
  }, [user, loading, router])

  const fetchStats = async () => {
    try {
      const { data, error } = await supabase
        .from('transactions')
        .select('amount, date')
      
      
      if (error) throw error

      const now = new Date()
      const currentMonth = now.getMonth()
      const currentYear = now.getFullYear()

      const newStats = (data || []).reduce((acc, curr) => {
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
      }, { totalExpenses: 0, monthlyExpenses: 0, savings: 0 })

      setStats(newStats)
    } catch (error) {
      console.error('Error fetching stats:', error)
    }
  }

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-muted">Loading...</div>
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
                <Button variant="secondary" onClick={() => setShowReportsModal(true)}>
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
      {showReportsModal && (
        <ReportsModal onClose={() => setShowReportsModal(false)} />
      )}
    </div>
  )
}
