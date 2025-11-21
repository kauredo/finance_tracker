'use client'

import { useState } from 'react'

interface DateRange {
  startDate: string
  endDate: string
}

interface UseDateRangeReturn {
  dateRange: DateRange
  setDateRange: (range: DateRange) => void
  resetDateRange: () => void
  isCustomRange: boolean
  setPreset: (preset: 'week' | 'month' | 'quarter' | 'year' | 'all') => void
}

export function useDateRange(initialPreset: 'month' | 'all' = 'month'): UseDateRangeReturn {
  const getPresetRange = (preset: string): DateRange => {
    const now = new Date()
    const endDate = now.toISOString().split('T')[0]
    
    switch (preset) {
      case 'week':
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
        return { startDate: weekAgo.toISOString().split('T')[0], endDate }
      
      case 'month':
        const monthAgo = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate())
        return { startDate: monthAgo.toISOString().split('T')[0], endDate }
      
      case 'quarter':
        const quarterAgo = new Date(now.getFullYear(), now.getMonth() - 3, now.getDate())
        return { startDate: quarterAgo.toISOString().split('T')[0], endDate }
      
      case 'year':
        const yearAgo = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate())
        return { startDate: yearAgo.toISOString().split('T')[0], endDate }
      
      case 'all':
      default:
        return { startDate: '', endDate: '' }
    }
  }

  const [dateRange, setDateRangeState] = useState<DateRange>(getPresetRange(initialPreset))
  const [preset, setPresetState] = useState<string>(initialPreset)

  const setDateRange = (range: DateRange) => {
    setDateRangeState(range)
    setPresetState('custom')
  }

  const setPreset = (newPreset: 'week' | 'month' | 'quarter' | 'year' | 'all') => {
    const range = getPresetRange(newPreset)
    setDateRangeState(range)
    setPresetState(newPreset)
  }

  const resetDateRange = () => {
    setPreset('month')
  }

  return {
    dateRange,
    setDateRange,
    resetDateRange,
    isCustomRange: preset === 'custom',
    setPreset
  }
}
