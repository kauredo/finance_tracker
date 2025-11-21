'use client'

import { Card } from '@/components/ui/Card'

interface DeleteConfirmModalProps {
  title: string
  message: string
  itemName?: string
  onConfirm: () => void
  onCancel: () => void
  isLoading?: boolean
}

export default function DeleteConfirmModal({
  title,
  message,
  itemName,
  onConfirm,
  onCancel,
  isLoading = false
}: DeleteConfirmModalProps) {
  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <Card variant="glass" className="w-full max-w-md">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-foreground">{title}</h2>
          <button
            onClick={onCancel}
            disabled={isLoading}
            className="text-muted hover:text-foreground text-2xl disabled:opacity-50"
          >
            ✕
          </button>
        </div>

        <div className="space-y-4">
          <div className="bg-danger/10 border border-danger/30 rounded-lg p-4">
            <p className="text-foreground">{message}</p>
            {itemName && (
              <p className="text-sm text-muted mt-2">
                <strong className="text-foreground">{itemName}</strong>
              </p>
            )}
          </div>

          <p className="text-sm text-muted">This action cannot be undone.</p>

          <div className="flex gap-3 pt-4">
            <button
              onClick={onCancel}
              disabled={isLoading}
              className="flex-1 px-4 py-3 bg-surface hover:bg-surface-alt text-foreground rounded-lg transition-all border border-border disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={onConfirm}
              disabled={isLoading}
              className="flex-1 bg-danger text-white font-bold py-3 rounded-lg hover:bg-danger/90 transition-all shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Deleting...' : 'Delete'}
            </button>
          </div>
        </div>
      </Card>
    </div>
  )
}
