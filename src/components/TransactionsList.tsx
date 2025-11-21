'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { createClient } from '@/utils/supabase/client'
import TransactionDetailModal from '@/components/TransactionDetailModal'
import Icon from '@/components/icons/Icon'

interface Transaction {
  id: string
  date: string
  description: string
  amount: number
  category: {
    name: string
    color: string
    icon: string
  } | null
  account: {
    name: string
  }
}

interface TransactionsListProps {
  searchQuery?: string
  accountFilter?: string
  categoryFilter?: string
  startDate?: string
  endDate?: string
  limit?: number
}

export default function TransactionsList({ 
  searchQuery = '',
  accountFilter = 'all',
  categoryFilter = 'all',
  startDate,
  endDate,
  limit = 100
}: TransactionsListProps = {}) {
  const { user } = useAuth()
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true) 
  const [selectedTransactionId, setSelectedTransactionId] = useState<string | null>(null)

  useEffect(() => {
    if (user) {
      fetchTransactions()
    }
  }, [user, searchQuery, accountFilter, categoryFilter, startDate, endDate])

  const fetchTransactions = async () => {
    try {
      const supabase = createClient()
      let query = supabase
        .from('transactions')
        .select(`
          id,
          date,
          description,
          amount,
          category:categories(name,color,icon),
          account:accounts(name,id)
        `)
        .order('date', { ascending: false })
        .limit(limit)

      // Apply search filter
      if (searchQuery) {
        query = query.ilike('description', `%${searchQuery}%`)
      }

      // Apply account filter
      if (accountFilter && accountFilter !== 'all') {
        query = query.eq('account_id', accountFilter)
      }

      // Apply category filter  
      if (categoryFilter && categoryFilter !== 'all') {
        query = query.eq('category_id', categoryFilter)
      }

      // Apply date range filters
      if (startDate) {
        query = query.gte('date', startDate)
      }
      if (endDate) {
        query = query.lte('date', endDate)
      }

      const { data, error } = await query

      if (error) throw error
      // Supabase might return account as an array if not properly typed, but we know it's a single relation
      const formattedData = (data || []).map((t: any) => ({
        ...t,
        account: Array.isArray(t.account) ? t.account[0] : t.account
      })) as unknown as Transaction[]
      
      setTransactions(formattedData)
    } catch (error) {
      console.error('Error fetching transactions:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return <div className="text-muted text-center py-8">Loading transactions...</div>
  }

  if (transactions.length === 0) {
    return (
      <div className="text-center py-12 text-muted">
        <Icon name="memo" size={48} className="mb-4 mx-auto" />
        <p className="text-lg font-medium">No transactions yet</p>
        <p className="text-sm mt-2">Upload a bank statement to get started</p>
      </div>
    )
  }

  return (
    <>
    <div className="overflow-x-auto">
      <table className="w-full text-left">
        <thead>
          <tr className="border-b border-border text-muted text-sm">
            <th className="pb-3 font-medium">Date</th>
            <th className="pb-3 font-medium">Description</th>
            <th className="pb-3 font-medium">Category</th>
            <th className="pb-3 font-medium">Account</th>
            <th className="pb-3 font-medium text-right">Amount</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {transactions.map((t) => (
            <tr 
              key={t.id} 
              onClick={() => setSelectedTransactionId(t.id)}
              className="group hover:bg-white/5 transition-colors cursor-pointer"
            >
              <td className="py-4 text-sm text-muted">{new Date(t.date).toLocaleDateString()}</td>
              <td className="py-4 text-foreground font-medium">{t.description}</td>
              <td className="py-4">
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-surface-alt text-foreground capitalize border border-border">
                  <Icon name={t.category?.icon as any || 'other'} size={14} className="mr-1.5" />
                  {t.category?.name || 'Uncategorized'}
                </span>
              </td>
              <td className="py-4 text-sm text-muted">{t.account?.name || 'Unknown'}</td>
              <td className={`py-4 text-right font-medium ${t.amount > 0 ? 'text-success' : 'text-foreground'}`}>
                {t.amount > 0 ? '+' : ''}{t.amount.toFixed(2)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>

    {/* Transaction Detail Modal */}
    {selectedTransactionId && (
      <TransactionDetailModal
        transactionId={selectedTransactionId!}
        onClose={() => setSelectedTransactionId(null)}
        onUpdate={() => {
          setSelectedTransactionId(null)
          fetchTransactions() // Refresh list after edit/delete
        }}
      />
    )}
  </>
  )
}
