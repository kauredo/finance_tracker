'use client'

import { useState, useEffect } from 'react'
import { Card } from '@/components/ui/Card'
import Icon, { IconName } from '@/components/icons/Icon'
import Link from 'next/link'

interface Goal {
  id: string
  name: string
  target_amount: number
  current_amount: number
  color: string
  icon: string
}

export default function GoalsWidget() {
  const [goals, setGoals] = useState<Goal[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchGoals()
  }, [])

  const fetchGoals = async () => {
    try {
      const response = await fetch('/api/goals')
      const data = await response.json()
      if (response.ok) {
        setGoals(data.goals || [])
      }
    } catch (error) {
      console.error('Error fetching goals:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) return <Card variant="glass" className="h-full animate-pulse bg-surface-alt" />

  const activeGoals = goals.filter(g => g.current_amount < g.target_amount).slice(0, 3)

  return (
    <Card variant="glass" className="h-full flex flex-col">
      <div className="p-6 flex-1">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
            <Icon name="savings" size={24} className="text-primary" />
            Savings Goals
          </h2>
          <Link 
            href="/goals"
            className="text-sm text-primary hover:text-primary/80 font-medium"
          >
            View All
          </Link>
        </div>

        {activeGoals.length === 0 ? (
          <div className="text-center py-8 text-muted">
            <p className="mb-4">No active goals</p>
            <Link
              href="/goals"
              className="px-4 py-2 bg-primary/10 text-primary rounded-lg hover:bg-primary/20 transition-colors text-sm font-medium"
            >
              Create Goal
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {activeGoals.map(goal => {
              const progress = Math.min((goal.current_amount / goal.target_amount) * 100, 100)
              
              return (
                <div key={goal.id} className="group">
                  <div className="flex justify-between text-sm mb-1">
                    <span className="font-medium text-foreground">{goal.name}</span>
                    <span className="text-muted">
                      €{goal.current_amount.toLocaleString()} / €{goal.target_amount.toLocaleString()}
                    </span>
                  </div>
                  <div className="h-2 bg-surface-alt rounded-full overflow-hidden">
                    <div
                      className="h-full transition-all duration-500"
                      style={{ width: `${progress}%`, backgroundColor: goal.color }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </Card>
  )
}
