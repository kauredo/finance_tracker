'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'

interface Account {
  id: string
  name: string
  type: 'personal' | 'joint'
  created_at: string
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
      const { data, error } = await supabase
        .from('accounts')
        .select('*')
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

  if (accounts.length === 0) {
    return (
      <div className="text-center py-8 text-muted">
        <p>No accounts yet</p>
        <p className="text-sm mt-2">Create an account to get started</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {accounts.map((account) => (
        <div
          key={account.id}
          className="px-4 py-3 bg-surface border border-border rounded-lg hover:bg-background transition-colors"
        >
          <div className="flex justify-between items-center">
            <div>
              <h4 className="font-medium text-foreground">{account.name}</h4>
              <p className="text-sm text-muted">
                {account.type === 'personal' ? '👤 Personal' : '👥 Joint'} Account
              </p>
            </div>
            <button className="text-muted hover:text-foreground text-sm">
              View →
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}
