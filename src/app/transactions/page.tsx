'use client'

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/contexts/ToastContext'
import { createClient } from '@/utils/supabase/client'
import NavBar from '@/components/NavBar'
import TransactionsList from '@/components/TransactionsList'
import AddTransactionModal from '@/components/AddTransactionModal'
import DateRangePicker from '@/components/DateRangePicker'
import { useDateRange } from '@/hooks/useDateRange'
import { Button } from '@/components/ui/Button'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import Icon from '@/components/icons/Icon'

export default function TransactionsPage() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  const pathname = usePathname()
  const toast = useToast()
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedAccount, setSelectedAccount] = useState<string>('all')
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [showAddModal, setShowAddModal] = useState(false)
  const [showDatePicker, setShowDatePicker] = useState(false)
  const { dateRange, setDateRange, setPreset } = useDateRange('month')
  
  const [accounts, setAccounts] = useState<Array<{ id: string; name: string }>>([])
  const [categories, setCategories] = useState<Array<{ id: string; name: string; icon: string }>>([])

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/auth')
    }
  }, [user, authLoading, router])

  useEffect(() => {
    if (user) {
      const fetchFiltersData = async () => {
        const supabase = createClient()
        try {
          const [accountsRes, categoriesRes] = await Promise.all([
            supabase.from('accounts').select('id, name').order('name'),
            supabase.from('categories').select('id, name, icon').order('name')
          ])

          if (accountsRes.data) setAccounts(accountsRes.data)
          if (categoriesRes.data) setCategories(categoriesRes.data)
        } catch (error) {
          console.error('Error fetching filter data:', error)
        }
      }
      fetchFiltersData()
    }
  }, [user])



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
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Transactions</h1>
            <p className="text-muted mt-1">Manage and track all your transactions</p>
          </div>
          <div className="flex gap-3">
            <Button 
              variant="secondary"
              onClick={() => setShowDatePicker(!showDatePicker)}
            >
              <Icon name="calendar" size={16} className="mr-2" />
              {dateRange.startDate ? 'Custom Range' : 'All Time'}
            </Button>
            <Button onClick={() => setShowAddModal(true)}>
              + Add Transaction
            </Button>
          </div>
        </div>

        {/* Date Range Picker */}
        {showDatePicker && (
          <div className="mb-6">
            <DateRangePicker
              startDate={dateRange.startDate}
              endDate={dateRange.endDate}
              onChange={(start, end) => setDateRange({ startDate: start, endDate: end })}
              onPresetChange={setPreset}
            />
          </div>
        )}

        {/* Filters */}
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* Search */}
              <input
                type="text"
                placeholder="Search transactions..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="px-4 py-2 rounded-lg bg-surface border border-border text-foreground placeholder-muted focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
              
              {/* Account Filter */}
              <select
                value={selectedAccount}
                onChange={(e) => setSelectedAccount(e.target.value)}
                className="px-4 py-2 rounded-lg bg-surface border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
              >
                <option value="all">All Accounts</option>
                {accounts.map(account => (
                  <option key={account.id} value={account.id}>{account.name}</option>
                ))}
              </select>

              {/* Category Filter */}
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="px-4 py-2 rounded-lg bg-surface border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
              >
                <option value="all">All Categories</option>
                {categories.map(category => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </div>
          </CardContent>
        </Card>

        {/* Transaction List */}
        <Card>
          <CardHeader>
            <CardTitle>All Transactions</CardTitle>
          </CardHeader>
          <CardContent>
            <TransactionsList 
              searchQuery={searchQuery}
              accountFilter={selectedAccount}
              categoryFilter={selectedCategory}
              startDate={dateRange.startDate}
              endDate={dateRange.endDate}
            />
          </CardContent>
        </Card>
      </main>

      {/* Add Transaction Modal */}
      {showAddModal && (
        <AddTransactionModal
          onClose={() => setShowAddModal(false)}
          onSuccess={() => {
            setShowAddModal(false)
            toast.success('Transaction created successfully!')
            // TransactionsList will auto-refresh via its useEffect
          }}
        />
      )}
    </div>
  )
}
