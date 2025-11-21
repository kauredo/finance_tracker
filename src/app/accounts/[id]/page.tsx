'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/contexts/ToastContext'
import { createClient } from '@/utils/supabase/client'
import NavBar from '@/components/NavBar'
import TransactionsList from '@/components/TransactionsList'
import EditAccountModal from '@/components/EditAccountModal'
import DeleteConfirmModal from '@/components/DeleteConfirmModal'
import { Button } from '@/components/ui/Button'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import Icon from '@/components/icons/Icon'
import Link from 'next/link'

interface Account {
  id: string
  name: string
  type: 'personal' | 'joint'
  balance: number | null
  created_at: string
}

export default function AccountDetailPage() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  const params = useParams()
  const toast = useToast()
  const accountId = params.id as string

  const [account, setAccount] = useState<Account | null>(null)
  const [loading, setLoading] = useState(true)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [transactionCount, setTransactionCount] = useState(0)

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/auth')
    } else if (user && accountId) {
      fetchAccountDetails()
    }
  }, [user, authLoading, accountId, router])

  const fetchAccountDetails = async () => {
    try {
      const supabase = createClient()
      
      // Fetch account details
      const { data: accountData, error: accountError } = await supabase
        .from('accounts')
        .select('id, name, type, balance, created_at')
        .eq('id', accountId)
        .single()

      if (accountError) throw accountError
      
      if (!accountData) {
        toast.error('Account not found')
        router.push('/accounts')
        return
      }

      setAccount(accountData)

      // Fetch transaction count for this account
      const { count } = await supabase
        .from('transactions')
        .select('*', { count: 'exact', head: true })
        .eq('account_id', accountId)

      setTransactionCount(count || 0)
    } catch (error) {
      console.error('Error fetching account:', error)
      toast.error('Failed to load account details')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async () => {
    try {
      const response = await fetch('/api/delete-account', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accountId })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to delete account')
      }

      toast.success('Account deleted successfully')
      router.push('/accounts')
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete account')
    }
  }

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-background">
        <NavBar />
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="animate-pulse">
            <div className="h-8 bg-surface-alt rounded w-48 mb-6" />
            <div className="h-32 bg-surface-alt rounded-xl" />
          </div>
        </main>
      </div>
    )
  }

  if (!account) {
    return null
  }

  return (
    <div className="min-h-screen bg-background">
      <NavBar />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-sm text-muted mb-6">
          <Link href="/accounts" className="hover:text-foreground transition-colors">
            Accounts
          </Link>
          <span>/</span>
          <span className="text-foreground">{account.name}</span>
        </nav>

        {/* Account Info Card */}
        <Card className="mb-8">
          <CardContent className="p-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="flex items-center justify-center w-16 h-16 rounded-xl bg-primary/10">
                  <Icon name={account.type === 'personal' ? 'personal' : 'joint'} size={32} />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-foreground mb-1">{account.name}</h1>
                  <p className="text-muted capitalize">{account.type} Account</p>
                  <p className="text-sm text-muted mt-1">
                    Created {new Date(account.created_at).toLocaleDateString()}
                  </p>
                </div>
              </div>
              
              <div className="flex flex-col items-end gap-2">
                <div className={`text-3xl font-bold ${
                  account.balance === null ? 'text-muted' :
                  account.balance >= 0 ? 'text-success' : 'text-danger'
                }`}>
                  {account.balance !== null ? `€${account.balance.toFixed(2)}` : 'N/A'}
                </div>
                <p className="text-xs text-muted">
                  {account.balance !== null ? 'Current Balance' : 'No transactions'}
                </p>
                <div className="flex gap-2 mt-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => setShowEditModal(true)}
                  >
                    <Icon name="edit" size={16} className="mr-1.5" />
                    Edit
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => setShowDeleteModal(true)}
                  >
                    <Icon name="delete" size={16} className="mr-1.5" />
                    Delete
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Transactions for this account */}
        <Card>
          <CardHeader>
            <CardTitle>Transactions ({transactionCount})</CardTitle>
          </CardHeader>
          <CardContent>
            <TransactionsList accountFilter={accountId} />
          </CardContent>
        </Card>
      </main>

      {/* Edit Account Modal */}
      {showEditModal && (
        <EditAccountModal
          account={account}
          onClose={() => setShowEditModal(false)}
          onSuccess={() => {
            setShowEditModal(false)
            fetchAccountDetails() // Refresh account data
            toast.success('Account updated successfully')
          }}
        />
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <DeleteConfirmModal
          title="Delete Account"
          message={
            transactionCount > 0
              ? `This account has ${transactionCount} transaction${transactionCount > 1 ? 's' : ''}. You cannot delete an account with existing transactions. Please delete or move the transactions first.`
              : `Are you sure you want to delete "${account.name}"? This action cannot be undone.`
          }
          confirmText={transactionCount > 0 ? 'OK' : 'Delete Account'}
          onConfirm={transactionCount > 0 ? undefined : handleDelete}
          onCancel={() => setShowDeleteModal(false)}
          variant={transactionCount > 0 ? 'info' : 'danger'}
        />
      )}
    </div>
  )
}
