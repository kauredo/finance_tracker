'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'

interface Account {
  id: string
  name: string
  type: 'personal' | 'joint'
}

interface EditAccountModalProps {
  account: Account
  onClose: () => void
  onSuccess: () => void
}

export default function EditAccountModal({ account, onClose, onSuccess }: EditAccountModalProps) {
  const [name, setName] = useState(account.name)
  const [type, setType] = useState<'personal' | 'joint'>(account.type)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!name.trim()) {
      setError('Account name is required')
      return
    }

    setLoading(true)

    try {
      const response = await fetch('/api/update-account', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accountId: account.id,
          name: name.trim(),
          type
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update account')
      }

      onSuccess()
    } catch (err: any) {
      setError(err.message || 'Failed to update account')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-surface border border-border rounded-xl shadow-xl max-w-md w-full">
        <div className="p-6 border-b border-border">
          <h2 className="text-xl font-bold text-foreground">Edit Account</h2>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-500 text-sm">
              {error}
            </div>
          )}

          <div>
            <label htmlFor="name" className="block text-sm font-medium text-foreground mb-2">
              Account Name
            </label>
            <Input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Main Checking"
              required
              autoFocus
            />
          </div>

          <div>
            <label htmlFor="type" className="block text-sm font-medium text-foreground mb-2">
              Account Type
            </label>
            <select
              id="type"
              value={type}
              onChange={(e) => setType(e.target.value as 'personal' | 'joint')}
              className="w-full px-4 py-2 rounded-lg bg-background border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
            >
              <option value="personal">Personal</option>
              <option value="joint">Joint</option>
            </select>
          </div>

          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              variant="secondary"
              onClick={onClose}
              disabled={loading}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading} className="flex-1">
              {loading ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
