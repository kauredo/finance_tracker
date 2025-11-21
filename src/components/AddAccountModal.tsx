'use client'

import { useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { createClient } from '@/utils/supabase/client'
import { Card } from '@/components/ui/Card'
import Icon from '@/components/icons/Icon'

interface AddAccountModalProps {
  onClose: () => void
  onSuccess: () => void
}

export default function AddAccountModal({ onClose, onSuccess }: AddAccountModalProps) {
  const { user } = useAuth()
  const [accountName, setAccountName] = useState('')
  const [accountType, setAccountType] = useState<'personal' | 'joint'>('personal')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        throw new Error('No active session')
      }

      // Call server-side API to create account (bypasses RLS issues)
      const response = await fetch('/api/create-account', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          accountName,
          accountType
        })
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to create account')
      }

      onSuccess()
      onClose()
    } catch (err: any) {
      console.error('Error creating account:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <Card variant="glass" className="w-full max-w-md">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-foreground">Add Account</h2>
          <button
            onClick={onClose}
            className="text-muted hover:text-foreground text-2xl"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-foreground text-sm font-medium mb-2">
              Account Name
            </label>
            <input
              type="text"
              value={accountName}
              onChange={(e) => setAccountName(e.target.value)}
              className="w-full px-4 py-3 rounded-lg bg-surface border border-border text-foreground placeholder-muted focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-transparent"
              placeholder="e.g., Main Checking, Savings"
              required
            />
          </div>

          <div>
            <label className="block text-foreground text-sm font-medium mb-2">
              Account Type
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setAccountType('personal')}
                className={`py-3 px-4 rounded-lg font-medium transition-all ${
                  accountType === 'personal'
                    ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg'
                    : 'bg-surface text-muted hover:text-foreground border border-border'
                }`}
              >
                <Icon name="personal" size={20} className="mr-2" />
                Personal
              </button>
              <button
                type="button"
                onClick={() => setAccountType('joint')}
                className={`py-3 px-4 rounded-lg font-medium transition-all ${
                  accountType === 'joint'
                    ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg'
                    : 'bg-surface text-muted hover:text-foreground border border-border'
                }`}
              >
                <Icon name="joint" size={20} className="mr-2" />
                Joint
              </button>
            </div>
            {accountType === 'joint' && (
              <p className="mt-2 text-xs text-muted">
                Note: Joint accounts are shared with your household members
              </p>
            )}
          </div>

          {error && (
            <div className="bg-red-500/20 border border-red-500/50 text-red-200 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

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
              {loading ? 'Creating...' : 'Create Account'}
            </button>
          </div>
        </form>
      </Card>
    </div>
  )
}
