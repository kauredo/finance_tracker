'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'

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

export default function TransactionsList() {
  const { user } = useAuth()
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (user) {
      fetchTransactions()
    }
  }, [user])

  const fetchTransactions = async () => {
    try {
      const { data, error } = await supabase
        .from('transactions')
        .select(`
          id,
          date,
          description,
          amount,
          category:categories(name,color,icon),
          account:accounts(name)
        `)
        .order('date', { ascending: false })
        .limit(10)

      if (error) throw error
      if (error) throw error
      // Supabase might return account as an array if not properly typed, but we know it's a single relation
      const formattedData = (data || []).map(t => ({
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
        <div className="text-5xl mb-4">📝</div>
        <p className="text-lg font-medium">No transactions yet</p>
        <p className="text-sm mt-2">Upload a bank statement to get started</p>
      </div>
    )
  }

  return (
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
            <tr key={t.id} className="group hover:bg-surface-alt transition-colors">
              <td className="py-4 text-sm text-muted">{new Date(t.date).toLocaleDateString()}</td>
              <td className="py-4 text-foreground font-medium">{t.description}</td>
              <td className="py-4">
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-surface-alt text-foreground capitalize border border-border">
                  {t.category?.icon} {t.category?.name || 'Uncategorized'}
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
  )
}
