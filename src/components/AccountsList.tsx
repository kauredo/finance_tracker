'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { createClient } from '@/utils/supabase/client'
import Link from 'next/link'

interface Account {
  id: string
  name: string
  type: 'personal' | 'joint'
  balance: number | null
}

export default function AccountsList() {
  const { user } = useAuth()
  const [accounts, setAccounts] = useState<Account[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (user) {
      fetchAccounts()
    }
  }, [user])

  const fetchAccounts = async () => {
    try {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('accounts')
        .select('id, name, type, balance')
        .order('created_at', { ascending: false })

      if (error) throw error
      setAccounts(data || [])
    } catch (error) {
      console.error('Error fetching accounts:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return <div className="text-muted">Loading accounts...</div>
  }

  if (!accounts.length) {
    return (
      <div className="text-center py-8">
        <p className="text-muted">No accounts yet</p>
        <p className="text-sm mt-2">Create an account to get started</p>
      </div>
    )
  }

  return (
    <div className="grid gap-4">
      {accounts.map((account) => (
        <div
          key={account.id}
          className="group bg-surface-alt/50 hover:bg-surface-alt border border-border rounded-lg p-4 transition-all hover:shadow-md cursor-pointer"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10">
                <span className="text-xl">
                  {account.type === 'personal' ? '👤' : '👥'}
                </span>
              </div>
              <div>
                <h4 className="font-semibold text-foreground group-hover:text-primary transition-colors">
                  {account.name}
                </h4>
                <p className="text-sm text-muted capitalize">{account.type} Account</p>
              </div>
            </div>
            <div className="text-right">
              <div className={`text-xl font-bold ${
                account.balance === null ? 'text-muted' :
                account.balance >= 0 ? 'text-success' : 'text-danger'
              }`}>
                {account.balance !== null ? `€${account.balance.toFixed(2)}` : 'N/A'}
              </div>
              <p className="text-xs text-muted mt-1">
                {account.balance !== null ? 'Current Balance' : 'No transactions'}
              </p>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
