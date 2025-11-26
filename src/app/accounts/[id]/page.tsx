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
import { Skeleton } from '@/components/ui/Skeleton'
import Icon from '@/components/icons/Icon'

interface Account {
  id: string
  name: string
  type: 'personal' | 'joint'
  balance: number
}

export default function AccountDetailPage() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  const params = useParams()
  const toast = useToast()
  const [account, setAccount] = useState<Account | null>(null)
  const [loading, setLoading] = useState(true)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [deleteLoading, setDeleteLoading] = useState(false)

  const accountId = params.id as string

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/auth')
    } else if (user && accountId) {
      fetchAccountDetails()
    }
  }, [user, authLoading, router, accountId])

  const fetchAccountDetails = async () => {
    try {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('accounts')
        .select('id, name, type, balance')
        .eq('id', accountId)
        .single()

      if (error) throw error
      setAccount(data)
    } catch (error) {
      console.error('Error fetching account:', error)
      toast.error('Failed to load account details')
      router.push('/accounts')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async () => {
    setDeleteLoading(true)
    try {
      const supabase = createClient()
      
      // Check for transactions first? 
      // Ideally backend handles cascade or we warn user.
      // For now, let's assume we can delete.
      
      const { error } = await supabase
        .from('accounts')
        .delete()
        .eq('id', accountId)

      if (error) throw error

      toast.success('Account deleted successfully')
      router.push('/accounts')
    } catch (error) {
      console.error('Error deleting account:', error)
      toast.error('Failed to delete account')
      setDeleteLoading(false)
      setShowDeleteModal(false)
    }
  }

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-background">
        <NavBar />
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex justify-between items-start mb-6">
            <div>
              <Skeleton variant="text" className="w-48 h-10 mb-2" />
              <Skeleton variant="text" className="w-24 h-5" />
            </div>
            <div className="flex gap-3">
               <Skeleton variant="rectangle" className="w-24 h-10 rounded-md" />
               <Skeleton variant="rectangle" className="w-24 h-10 rounded-md" />
            </div>
          </div>
          <Card className="mb-6">
             <CardContent className="p-6">
                <Skeleton variant="text" className="w-32 h-4 mb-2" />
                <Skeleton variant="text" className="w-48 h-8" />
             </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <Skeleton variant="text" className="w-40 h-7" />
            </CardHeader>
            <CardContent>
               <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} variant="rectangle" className="w-full h-16 rounded-lg" />
                ))}
              </div>
            </CardContent>
          </Card>
        </main>
      </div>
    )
  }

  if (!account) return null

  return (
    <div className="min-h-screen bg-background">
      <NavBar />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-primary/10 rounded-xl">
              <Icon name={account.type === 'personal' ? 'personal' : 'joint'} size={32} className="text-primary" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-foreground">{account.name}</h1>
              <p className="text-muted capitalize">{account.type} Account</p>
            </div>
          </div>
          <div className="flex gap-3">
            <Button variant="secondary" onClick={() => setShowEditModal(true)}>
              Edit Account
            </Button>
            <Button variant="danger" onClick={() => setShowDeleteModal(true)}>
              Delete Account
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
           <Card>
             <CardContent className="pt-6">
               <div className="text-sm text-muted mb-1">Current Balance</div>
               <div className={`text-3xl font-bold ${account.balance >= 0 ? 'text-success' : 'text-danger'}`}>
                 €{account.balance.toFixed(2)}
               </div>
             </CardContent>
           </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Transactions</CardTitle>
          </CardHeader>
          <CardContent>
            <TransactionsList accountFilter={accountId} />
          </CardContent>
        </Card>
      </main>

      {showEditModal && (
        <EditAccountModal
          account={account}
          onClose={() => setShowEditModal(false)}
          onSuccess={() => {
            setShowEditModal(false)
            fetchAccountDetails()
            toast.success('Account updated successfully')
          }}
        />
      )}

      {showDeleteModal && (
        <DeleteConfirmModal
          title="Delete Account"
          message="Are you sure you want to delete this account? This will also delete all associated transactions."
          itemName={account.name}
          confirmText="Delete Account"
          onConfirm={handleDelete}
          onCancel={() => setShowDeleteModal(false)}
          isLoading={deleteLoading}
        />
      )}
    </div>
  )
}
