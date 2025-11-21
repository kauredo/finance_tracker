'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import NavBar from '@/components/NavBar'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import Icon, { IconName } from '@/components/icons/Icon'
import RecurringTransactionModal from '@/components/RecurringTransactionModal'
import { format } from 'date-fns'

interface RecurringTransaction {
  id: string
  description: string
  amount: number
  interval: string
  next_run_date: string
  active: boolean
  category?: {
    name: string
    icon: string
    color: string
  }
  account?: {
    name: string
  }
}

export default function RecurringPage() {
  const { user, loading: authLoading } = useAuth()
  const [recurring, setRecurring] = useState<RecurringTransaction[]>([])
  const [loading, setLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editId, setEditId] = useState<string | undefined>(undefined)

  useEffect(() => {
    if (user) {
      fetchRecurring()
    }
  }, [user])

  const fetchRecurring = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/recurring')
      const data = await res.json()
      if (data.recurring) {
        setRecurring(data.recurring)
      }
    } catch (error) {
      console.error('Error fetching recurring:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleEdit = (id: string) => {
    setEditId(id)
    setIsModalOpen(true)
  }

  const handleAdd = () => {
    setEditId(undefined)
    setIsModalOpen(true)
  }

  const handleToggleActive = async (id: string, currentStatus: boolean) => {
    try {
      const res = await fetch(`/api/recurring/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active: !currentStatus })
      })
      if (res.ok) fetchRecurring()
    } catch (error) {
      console.error('Error toggling status:', error)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this recurring transaction?')) return
    
    try {
      const res = await fetch(`/api/recurring/${id}`, {
        method: 'DELETE'
      })
      if (res.ok) fetchRecurring()
    } catch (error) {
      console.error('Error deleting:', error)
    }
  }

  if (authLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-muted">Loading...</div>
      </div>
    )
  }

  return (
    <>
      <NavBar />
      <div className="min-h-screen bg-background p-6">
        <div className="max-w-6xl mx-auto">
          <div className="flex justify-between items-center mb-8">
            <div>
              <h1 className="text-4xl font-bold text-foreground mb-2">
                Recurring Transactions
              </h1>
              <p className="text-muted">
                Manage your subscriptions, bills, and salary
              </p>
            </div>
            <Button onClick={handleAdd} variant="primary" className="flex items-center gap-2">
              <Icon name="plus" size={20} />
              Add New
            </Button>
          </div>

          {loading ? (
            <div className="text-center py-12 text-muted">Loading...</div>
          ) : recurring.length === 0 ? (
            <div className="text-center py-12 bg-surface border border-border rounded-xl">
              <div className="w-16 h-16 bg-surface-alt rounded-full flex items-center justify-center mx-auto mb-4 text-muted">
                <Icon name="calendar" size={32} />
              </div>
              <h3 className="text-lg font-medium text-foreground mb-2">No recurring transactions</h3>
              <p className="text-muted mb-6">Set up your first recurring transaction to automate your finances.</p>
              <Button onClick={handleAdd} variant="primary">
                Create One
              </Button>
            </div>
          ) : (
            <div className="grid gap-4">
              {recurring.map((item) => (
                <Card key={item.id} variant="glass" className={`p-4 flex items-center justify-between ${!item.active ? 'opacity-60' : ''}`}>
                  <div className="flex items-center gap-4">
                    <div 
                      className="w-12 h-12 rounded-xl flex items-center justify-center"
                      style={{ 
                        backgroundColor: item.category ? `${item.category.color}20` : '#8882',
                        color: item.category ? item.category.color : '#888'
                      }}
                    >
                      <Icon name={(item.category?.icon as IconName) || 'other'} size={24} />
                    </div>
                    <div>
                      <h3 className="font-semibold text-foreground text-lg">{item.description}</h3>
                      <div className="flex items-center gap-2 text-sm text-muted">
                        <span className="capitalize">{item.interval}</span>
                        <span>•</span>
                        <span>Next: {format(new Date(item.next_run_date), 'MMM d, yyyy')}</span>
                        <span>•</span>
                        <span>{item.account?.name}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-6">
                    <div className={`text-lg font-bold ${item.amount >= 0 ? 'text-success' : 'text-foreground'}`}>
                      {item.amount >= 0 ? '+' : ''}€{Math.abs(item.amount).toFixed(2)}
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleToggleActive(item.id, item.active)}
                        className={`p-2 rounded-lg transition-colors ${item.active ? 'text-success hover:bg-success/10' : 'text-muted hover:bg-surface-alt'}`}
                        title={item.active ? 'Active' : 'Paused'}
                      >
                        <Icon name={item.active ? 'check' : 'close'} size={20} />
                      </button>
                      <button
                        onClick={() => handleEdit(item.id)}
                        className="p-2 text-muted hover:text-primary hover:bg-primary/10 rounded-lg transition-colors"
                        title="Edit"
                      >
                        <Icon name="edit" size={20} />
                      </button>
                      <button
                        onClick={() => handleDelete(item.id)}
                        className="p-2 text-muted hover:text-danger hover:bg-danger/10 rounded-lg transition-colors"
                        title="Delete"
                      >
                        <Icon name="trash" size={20} />
                      </button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>

      <RecurringTransactionModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={fetchRecurring}
        editId={editId}
      />
    </>
  )
}
