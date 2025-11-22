'use client'

import { useState } from 'react'
import { Card } from '@/components/ui/Card'
import { useToast } from '@/contexts/ToastContext'
import Icon, { IconName } from '@/components/icons/Icon'

interface Goal {
  id: string
  name: string
  target_amount: number
  current_amount: number
  target_date: string | null
  color: string
  icon: string
}

interface GoalModalProps {
  goal?: Goal
  onClose: () => void
  onSuccess: () => void
}

const ICON_OPTIONS = [
  'savings', 'car', 'home', 'vacation', 'emergency',
  'education', 'investment', 'gift', 'electronics', 'other'
]

const COLOR_PRESETS = [
  '#10b981', // green
  '#f59e0b', // amber
  '#3b82f6', // blue
  '#8b5cf6', // purple
  '#ec4899', // pink
  '#f43f5e', // rose
  '#06b6d4', // cyan
  '#22c55e', // green
  '#6b7280', // gray
  '#ef4444', // red
]

export default function GoalModal({ goal, onClose, onSuccess }: GoalModalProps) {
  const { error: showError, success: showSuccess } = useToast()
  const [loading, setLoading] = useState(false)
  
  const [formData, setFormData] = useState<{
    name: string
    target_amount: string | number
    current_amount: string | number
    target_date: string
    color: string
    icon: string
  }>({
    name: goal?.name || '',
    target_amount: goal?.target_amount || '',
    current_amount: goal?.current_amount || 0,
    target_date: goal?.target_date || '',
    color: goal?.color || '#10b981',
    icon: goal?.icon || 'savings'
  })

  const isEdit = !!goal

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.name || !formData.target_amount) {
      showError('Please fill in required fields')
      return
    }

    setLoading(true)
    try {
      const url = isEdit ? `/api/goals/${goal.id}` : '/api/goals'
      const method = isEdit ? 'PUT' : 'POST'

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          target_amount: Number(formData.target_amount),
          current_amount: Number(formData.current_amount)
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to save goal')
      }

      showSuccess(`Goal ${isEdit ? 'updated' : 'created'} successfully`)
      onSuccess()
    } catch (error) {
      console.error('Error saving goal:', error)
      showError(error instanceof Error ? error.message : 'Failed to save goal')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <Card variant="glass" className="w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-foreground">
            {isEdit ? 'Edit Goal' : 'New Savings Goal'}
          </h2>
          <button
            onClick={onClose}
            disabled={loading}
            className="text-muted hover:text-foreground text-2xl disabled:opacity-50"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-muted mb-2">
              Goal Name *
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={e => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g., New Car"
              className="w-full px-4 py-3 bg-surface border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-foreground"
              required
            />
          </div>

          {/* Amounts */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-muted mb-2">
                Target Amount *
              </label>
              <input
                type="number"
                value={formData.target_amount}
                onChange={e => setFormData({ ...formData, target_amount: e.target.value })}
                placeholder="0.00"
                min="0"
                step="0.01"
                className="w-full px-4 py-3 bg-surface border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-foreground"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-muted mb-2">
                Current Saved
              </label>
              <input
                type="number"
                value={formData.current_amount}
                onChange={e => setFormData({ ...formData, current_amount: e.target.value })}
                placeholder="0.00"
                min="0"
                step="0.01"
                className="w-full px-4 py-3 bg-surface border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-foreground"
              />
            </div>
          </div>

          {/* Target Date */}
          <div>
            <label className="block text-sm font-medium text-muted mb-2">
              Target Date (Optional)
            </label>
            <input
              type="date"
              value={formData.target_date || ''}
              onChange={e => setFormData({ ...formData, target_date: e.target.value })}
              className="w-full px-4 py-3 bg-surface border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-foreground"
            />
          </div>

          {/* Icon */}
          <div>
            <label className="block text-sm font-medium text-muted mb-3">
              Icon
            </label>
            <div className="grid grid-cols-5 gap-2">
              {ICON_OPTIONS.map(iconName => (
                <button
                  key={iconName}
                  type="button"
                  onClick={() => setFormData({ ...formData, icon: iconName })}
                  className={`p-3 rounded-lg border-2 transition-all hover:scale-110 flex items-center justify-center ${
                    formData.icon === iconName
                      ? 'border-primary bg-primary/10'
                      : 'border-border bg-surface hover:border-primary/50'
                  }`}
                >
                  <Icon name={iconName as IconName} size={24} />
                </button>
              ))}
            </div>
          </div>

          {/* Color */}
          <div>
            <label className="block text-sm font-medium text-muted mb-3">
              Color
            </label>
            <div className="grid grid-cols-5 gap-2">
              {COLOR_PRESETS.map(color => (
                <button
                  key={color}
                  type="button"
                  onClick={() => setFormData({ ...formData, color })}
                  className={`h-10 rounded-lg border-2 transition-all hover:scale-110 ${
                    formData.color === color
                      ? 'border-foreground ring-2 ring-primary'
                      : 'border-border'
                  }`}
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="flex-1 px-4 py-3 bg-surface hover:bg-surface-alt text-foreground rounded-lg transition-all border border-border"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-primary text-white font-bold py-3 rounded-lg hover:bg-primary/90 transition-all shadow-lg hover:shadow-xl disabled:opacity-50"
            >
              {loading ? 'Saving...' : isEdit ? 'Update Goal' : 'Create Goal'}
            </button>
          </div>
        </form>
      </Card>
    </div>
  )
}
