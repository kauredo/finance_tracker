'use client'

import { InputHTMLAttributes, forwardRef, ReactNode } from 'react'
import { cn } from '@/lib/utils'

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  error?: boolean
  icon?: ReactNode
  helperText?: string
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, error, icon, helperText, ...props }, ref) => {
    const baseStyles = 'w-full px-4 py-2.5 bg-surface border border-border rounded-lg transition-all focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary disabled:bg-surface/50 disabled:cursor-not-allowed disabled:opacity-60'
    
    const errorStyles = error ? 'border-danger focus:ring-danger/50 focus:border-danger' : ''
    
    const inputWithIcon = icon ? 'pl-10' : ''
    
    return (
      <div className="w-full">
        <div className="relative">
          {icon && (
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted pointer-events-none">
              {icon}
            </div>
          )}
          <input
            ref={ref}
            className={cn(
              baseStyles,
              errorStyles,
              inputWithIcon,
              className
            )}
            {...props}
          />
        </div>
        {helperText && (
          <p className={cn(
            'mt-1.5 text-sm',
            error ? 'text-danger' : 'text-muted'
          )}>
            {helperText}
          </p>
        )}
      </div>
    )
  }
)

Input.displayName = 'Input'

export { Input }
