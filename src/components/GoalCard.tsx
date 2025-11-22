'use client'

import { Card } from '@/components/ui/Card'
import Icon, { IconName } from '@/components/icons/Icon'
import { format } from 'date-fns'

interface Goal {
  id: string
  name: string
  target_amount: number
  current_amount: number
  target_date: string | null
  color: string
  icon: string
}

interface GoalCardProps {
  goal: Goal
  onEdit: (goal: Goal) => void
  onDelete: (goal: Goal) => void
  onAddMoney: (goal: Goal) => void
}

export default function GoalCard({ goal, onEdit, onDelete, onAddMoney }: GoalCardProps) {
  const progress = Math.min((goal.current_amount / goal.target_amount) * 100, 100)
  const remaining = Math.max(goal.target_amount - goal.current_amount, 0)
  
  return (
    <Card variant="glass" className="group hover:shadow-lg transition-all">
      <div className="p-5">
        <div className="flex justify-between items-start mb-4">
          <div className="flex items-center gap-3">
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center transition-transform group-hover:scale-110"
              style={{ backgroundColor: `${goal.color}20`, color: goal.color }}
            >
              <Icon name={goal.icon as IconName} size={24} />
            </div>
            <div>
              <h3 className="font-bold text-foreground text-lg">{goal.name}</h3>
              {goal.target_date && (
                <p className="text-xs text-muted">
                  Target: {format(new Date(goal.target_date), 'MMM d, yyyy')}
                </p>
              )}
            </div>
          </div>
          
          <div className="relative group/menu">
            <button className="p-2 text-muted hover:text-foreground rounded-lg hover:bg-surface-alt transition-colors">
              <Icon name="other" size={20} />
            </button>
            <div className="absolute right-0 mt-1 w-32 bg-surface border border-border rounded-lg shadow-xl opacity-0 invisible group-hover/menu:opacity-100 group-hover/menu:visible transition-all z-10">
              <button
                onClick={() => onEdit(goal)}
                className="w-full text-left px-4 py-2 text-sm text-foreground hover:bg-surface-alt first:rounded-t-lg"
              >
                Edit
              </button>
              <button
                onClick={() => onDelete(goal)}
                className="w-full text-left px-4 py-2 text-sm text-danger hover:bg-danger/10 last:rounded-b-lg"
              >
                Delete
              </button>
            </div>
          </div>
        </div>

        <div className="mb-4">
          <div className="flex justify-between items-end mb-2">
            <span className="text-2xl font-bold text-foreground">
              €{goal.current_amount.toLocaleString()}
            </span>
            <span className="text-sm text-muted">
              of €{goal.target_amount.toLocaleString()}
            </span>
          </div>
          
          <div className="h-3 bg-surface-alt rounded-full overflow-hidden">
            <div
              className="h-full transition-all duration-1000 ease-out"
              style={{ width: `${progress}%`, backgroundColor: goal.color }}
            />
          </div>
          
          <div className="flex justify-between mt-2 text-xs text-muted">
            <span>{progress.toFixed(0)}% Complete</span>
            <span>€{remaining.toLocaleString()} to go</span>
          </div>
        </div>

        <button
          onClick={() => onAddMoney(goal)}
          className="w-full py-2 bg-primary/10 text-primary font-semibold rounded-lg hover:bg-primary/20 transition-colors flex items-center justify-center gap-2"
        >
          <span>+</span> Add Money
        </button>
      </div>
    </Card>
  )
}
