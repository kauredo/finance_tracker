'use client'

import { useState, useEffect } from 'react'
import { useToast } from '@/contexts/ToastContext'
import { Card } from '@/components/ui/Card'
import { createClient } from '@/utils/supabase/client'
import DeleteConfirmModal from '@/components/DeleteConfirmModal'
import EditTransactionModal from '@/components/EditTransactionModal'
import Icon from '@/components/icons/Icon'

interface TransactionDetailModalProps {
  transactionId: string
  onClose: () => void
  onUpdate: () => void
}

interface Transaction {
  id: string
  date: string
  description: string
  amount: number
  created_at: string
  category: {
    id: string
    name: string
    icon: string
    color: string
  } | null
  account: {
    id: string
    name: string
    type: string
  }
}

export default function TransactionDetailModal({ transactionId, onClose, onUpdate }: TransactionDetailModalProps) {
  const toast = useToast()
  const [transaction, setTransaction] = useState<Transaction | null>(null)
  const [loading, setLoading] = useState(true)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    fetchTransaction()
  }, [transactionId])

  const fetchTransaction = async () => {
    try {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('transactions')
        .select(`
          id,
          date,
          description,
          amount,
          created_at,
          category:categories(id,name,color,icon),
          account:accounts(id,name,type)
        `)
        .eq('id', transactionId)
        .single()

      if (error) throw error
      
      // Handle potential array response for relations
      const formattedData = {
        ...data,
        category: Array.isArray(data.category) ? data.category[0] : data.category,
        account: Array.isArray(data.account) ? data.account[0] : data.account
      }
      
      setTransaction(formattedData as Transaction)
    } catch (error: any) {
      console.error('Error fetching transaction:', error)
      toast.error('Failed to load transaction details')
      onClose()
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async () => {
    setDeleting(true)
    try {
      const supabase = createClient()
      const { error } = await supabase
        .from('transactions')
        .delete()
        .eq('id', transactionId)

      if (error) throw error

      toast.success('Transaction deleted successfully!')
      onUpdate()
      onClose()
    } catch (error: any) {
      console.error('Error deleting transaction:', error)
      toast.error(error.message || 'Failed to delete transaction')
    } finally {
      setDeleting(false)
    }
  }

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
        <Card variant="glass" className="w-full max-w-md">
          <div className="text-center py-8 text-muted">Loading...</div>
        </Card>
      </div>
    )
  }

  if (!transaction) {
    return null
  }

  const isExpense = transaction.amount < 0

  return (
    <>
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
        <Card variant="glass" className="w-full max-w-md">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-foreground">Transaction Details</h2>
            <button
              onClick={onClose}
              className="text-muted hover:text-foreground text-2xl"
            >
              ✕
            </button>
          </div>

          <div className="space-y-4">
            {/* Type Badge */}
            <div>
              <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                isExpense ? 'bg-danger/20 text-danger' : 'bg-success/20 text-success'
              }`}>
                {isExpense ? (
                  <>
                    <Icon name="expense" size={16} className="mr-2" />
                    Expense
                  </>
                ) : (
                  <>
                    <Icon name="income" size={16} className="mr-2" />
                    Income
                  </>
                )}
              </span>
            </div>

            {/* Amount */}
            <div className="bg-surface-alt/50 p-4 rounded-lg">
              <div className="text-sm text-muted mb-1">Amount</div>
              <div className={`text-3xl font-bold ${isExpense ? 'text-danger' : 'text-success'}`}>
                {isExpense ? '-' : '+'}€{Math.abs(transaction.amount).toFixed(2)}
              </div>
            </div>

            {/* Description */}
            <div>
              <div className="text-sm text-muted mb-1">Description</div>
              <div className="text-foreground font-medium">{transaction.description}</div>
            </div>

            {/* Date */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-sm text-muted mb-1">Date</div>
                <div className="text-foreground">{new Date(transaction.date).toLocaleDateString()}</div>
              </div>
              <div>
                <div className="text-sm text-muted mb-1">Created</div>
                <div className="text-foreground text-sm">{new Date(transaction.created_at).toLocaleDateString()}</div>
              </div>
            </div>

            {/* Category */}
            <div>
              <div className="text-sm text-muted mb-1">Category</div>
              {transaction.category ? (
                <span className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-surface-alt text-foreground">
                  <Icon name={transaction.category.icon as any} size={16} className="mr-2" />
                  {transaction.category.name}
                </span>
              ) : (
                <span className="text-muted text-sm">Uncategorized</span>
              )}
            </div>

            {/* Account */}
            <div>
              <div className="text-sm text-muted mb-1">Account</div>
              <div className="text-foreground">
                <div className="flex items-center gap-2">
                  <Icon name={transaction.account.type === 'personal' ? 'personal' : 'joint'} size={16} />
                  {transaction.account.name}
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-4 border-t border-border">
              <button
                onClick={() => setShowEditModal(true)}
                className="flex-1 px-4 py-3 bg-surface hover:bg-surface-alt text-foreground font-medium rounded-lg transition-all border border-border"
              >
                <Icon name="edit" size={18} className="mr-2" />
                Edit
              </button>
              <button
                onClick={() => setShowDeleteModal(true)}
                className="flex-1 px-4 py-3 bg-danger/20 hover:bg-danger/30 text-danger font-medium rounded-lg transition-all border border-danger/30"
              >
                <Icon name="delete" size={18} className="mr-2" />
                Delete
              </button>
            </div>
          </div>
        </Card>
      </div>

      {/* Edit Modal */}
      {showEditModal && (
        <EditTransactionModal
          transactionId={transactionId}
          onClose={() => setShowEditModal(false)}
          onSuccess={() => {
            setShowEditModal(false)
            fetchTransaction() // Refresh details
            onUpdate() // Refresh parent list
          }}
        />
      )}

      {/* Delete Confirmation */}
      {showDeleteModal && (
        <DeleteConfirmModal
          title="Delete Transaction"
          message="Are you sure you want to delete this transaction?"
          itemName={transaction.description}
          isLoading={deleting}
          onConfirm={handleDelete}
          onCancel={() => setShowDeleteModal(false)}
        />
      )}
    </>
  )
}
