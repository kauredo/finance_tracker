'use client'

import { useState, useEffect } from 'react'
import { useToast } from '@/contexts/ToastContext'
import { Card } from '@/components/ui/Card'
import { createClient } from '@/utils/supabase/client'

interface EditTransactionModalProps {
  transactionId: string
  onClose: () => void
  onSuccess: () => void
}

interface Account {
  id: string
  name: string
  type: string
}

interface Category {
  id: string
  name: string
  icon: string
  color: string
}

interface Transaction {
  id: string
  account_id: string
  date: string
  description: string
  amount: number
  category_id: string | null
}

export default function EditTransactionModal({ transactionId, onClose, onSuccess }: EditTransactionModalProps) {
  const toast = useToast()
  const [loading, setLoading] = useState(false)
  const [accounts, setAccounts] = useState<Account[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [loadingData, setLoadingData] = useState(true)

  const [formData, setFormData] = useState({
    account_id: '',
    date: '',
    description: '',
    amount: '',
    category_id: '',
    transactionType: 'expense'
  })

  useEffect(() => {
    fetchData()
  }, [transactionId])

  const fetchData = async () => {
    try {
      const supabase = createClient()
      const [transactionRes, accountsRes, categoriesRes] = await Promise.all([
        fetch(`/api/transactions/${transactionId}`),
        supabase.from('accounts').select('id, name, type').order('name'),
        supabase.from('categories').select('id, name, icon, color').order('name')
      ])

      const transactionData = await transactionRes.json()
      if (!transactionRes.ok) throw new Error(transactionData.error)

      if (accountsRes.error) throw accountsRes.error
      if (categoriesRes.error) throw categoriesRes.error

      setAccounts(accountsRes.data || [])
      setCategories(categoriesRes.data || [])

      const tx = transactionData.transaction
      setFormData({
        account_id: tx.account_id || '',
        date: tx.date,
        description: tx.description,
        amount: Math.abs(tx.amount).toString(),
        category_id: tx.category_id || '',
        transactionType: tx.amount < 0 ? 'expense' : 'income'
      })
    } catch (error: any) {
      console.error('Error fetching data:', error)
      toast.error('Failed to load transaction data')
      onClose()
    } finally {
      setLoadingData(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    setLoading(true)

    try {
      const finalAmount = formData.transactionType === 'expense' 
        ? -Math.abs(parseFloat(formData.amount))
        : Math.abs(parseFloat(formData.amount))

      const response = await fetch(`/api/transactions/${transactionId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          account_id: formData.account_id,
          date: formData.date,
          description: formData.description,
          amount: finalAmount,
          category_id: formData.category_id || null
        })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to update transaction')
      }

      toast.success('Transaction updated successfully!')
      onSuccess()
      onClose()
    } catch (error: any) {
      console.error('Error updating transaction:', error)
      toast.error(error.message || 'Failed to update transaction')
    } finally {
      setLoading(false)
    }
  }

  if (loadingData) {
    return (
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
        <Card variant="glass" className="w-full max-w-md">
          <div className="text-center py-8 text-muted">Loading...</div>
        </Card>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <Card variant="glass" className="w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-foreground">Edit Transaction</h2>
          <button
            onClick={onClose}
            className="text-muted hover:text-foreground text-2xl"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Transaction Type Toggle */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Transaction Type
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setFormData(prev => ({ ...prev, transactionType: 'expense' }))}
                className={`py-3 px-4 rounded-lg font-medium transition-all ${
                  formData.transactionType === 'expense'
                    ? 'bg-danger text-white shadow-lg'
                    : 'bg-surface text-muted hover:text-foreground border border-border'
                }`}
              >
                💸 Expense
              </button>
              <button
                type="button"
                onClick={() => setFormData(prev => ({ ...prev, transactionType: 'income' }))}
                className={`py-3 px-4 rounded-lg font-medium transition-all ${
                  formData.transactionType === 'income'
                    ? 'bg-success text-white shadow-lg'
                    : 'bg-surface text-muted hover:text-foreground border border-border'
                }`}
              >
                💰 Income
              </button>
            </div>
          </div>

          {/* Account */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Account
            </label>
            <select
              value={formData.account_id}
              onChange={(e) => setFormData(prev => ({ ...prev, account_id: e.target.value }))}
              className="w-full px-4 py-3 rounded-lg bg-surface border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
              required
            >
              <option value="">Select account</option>
              {accounts.map(account => (
                <option key={account.id} value={account.id}>
                  {account.type === 'personal' ? '👤' : '👥'} {account.name}
                </option>
              ))}
            </select>
          </div>

          {/* Date */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Date
            </label>
            <input
              type="date"
              value={formData.date}
              onChange={(e) => setFormData(prev => ({ ...prev, date: e.target.value }))}
              className="w-full px-4 py-3 rounded-lg bg-surface border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
              required
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Description
            </label>
            <input
              type="text"
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              className="w-full px-4 py-3 rounded-lg bg-surface border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
              required
            />
          </div>

          {/* Amount */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Amount (€)
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={formData.amount}
              onChange={(e) => setFormData(prev => ({ ...prev, amount: e.target.value }))}
              className="w-full px-4 py-3 rounded-lg bg-surface border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
              required
            />
          </div>

          {/* Category */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Category
            </label>
            <select
              value={formData.category_id}
              onChange={(e) => setFormData(prev => ({ ...prev, category_id: e.target.value }))}
              className="w-full px-4 py-3 rounded-lg bg-surface border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
            >
              <option value="">Uncategorized</option>
              {categories.map(category => (
                <option key={category.id} value={category.id}>
                  {category.icon} {category.name}
                </option>
              ))}
            </select>
          </div>

          {/* Submit */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-3 bg-surface hover:bg-surface-alt text-foreground rounded-lg transition-all border border-border"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-gradient-to-r from-purple-500 to-pink-500 text-white font-bold py-3 rounded-lg hover:from-purple-600 hover:to-pink-600 transition-all shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </Card>
    </div>
  )
}
