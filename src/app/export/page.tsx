'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/contexts/ToastContext'
import NavBar from '@/components/NavBar'
import { Card } from '@/components/ui/Card'
import { format } from 'date-fns'
import { createClient } from '@/utils/supabase/client'

interface Account {
  id: string
  name: string
}

export default function DataExportPage() {
  const { user, loading: authLoading } = useAuth()
  const { error: showError, success: showSuccess } = useToast()
  const [accounts, setAccounts] = useState<Account[]>([])
  const [loading, setLoading] = useState(true)
  const [exporting, setExporting] = useState(false)
  
  // Filters
  const [selectedAccount, setSelectedAccount] = useState<string>('all')
  const [startDate, setStartDate] = useState<string>('')
  const [endDate, setEndDate] = useState<string>(format(new Date(), 'yyyy-MM-dd'))
  const [exportFormat, setExportFormat] = useState<'csv' | 'excel'>('csv')

  useEffect(() => {
    if (user) {
      fetchAccounts()
    }
  }, [user])

  const fetchAccounts = async () => {
    setLoading(true)
    try {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('accounts')
        .select('id, name')
        .order('name')

      if (error) throw error
      setAccounts(data || [])
    } catch (error) {
      console.error('Error fetching accounts:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleExport = async () => {
    setExporting(true)
    try {
      // Build query parameters
      const params = new URLSearchParams()
      params.append('format', exportFormat)
      
      if (selectedAccount !== 'all') {
        params.append('accountId', selectedAccount)
      }
      
      if (startDate) {
        params.append('startDate', startDate)
      }
      
      if (endDate) {
        params.append('endDate', endDate)
      }

      const response = await fetch(`/api/export?${params.toString()}`)

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        console.error('Export API error:', errorData)
        throw new Error(errorData.error || 'Export failed')
      }

      // Download the file
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `transactions_${format(new Date(), 'yyyy-MM-dd')}.${exportFormat === 'csv' ? 'csv' : 'xlsx'}`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      window.URL.revokeObjectURL(url)

      showSuccess('Data exported successfully!')
    } catch (error) {
      console.error('Error exporting data:', error)
      showError(error instanceof Error ? error.message : 'Failed to export data')
    } finally {
      setExporting(false)
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
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-foreground mb-2">
            Export Data
          </h1>
          <p className="text-muted">
            Download your transaction data in various formats
          </p>
        </div>

        <Card variant="glass" className="p-6">
          <div className="space-y-6">
            {/* Export Format */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-3">
                Export Format
              </label>
              <div className="grid grid-cols-2 gap-4">
                <button
                  onClick={() => setExportFormat('csv')}
                  className={`p-4 rounded-lg border-2 transition-all ${
                    exportFormat === 'csv'
                      ? 'border-primary bg-primary/10'
                      : 'border-border bg-surface hover:border-primary/50'
                  }`}
                >
                  <div className="text-center">
                    <div className="text-2xl mb-2">📄</div>
                    <div className="font-semibold text-foreground">CSV</div>
                    <div className="text-xs text-muted mt-1">
                      Spreadsheet compatible
                    </div>
                  </div>
                </button>
                <button
                  onClick={() => setExportFormat('excel')}
                  className={`p-4 rounded-lg border-2 transition-all ${
                    exportFormat === 'excel'
                      ? 'border-primary bg-primary/10'
                      : 'border-border bg-surface hover:border-primary/50'
                  }`}
                >
                  <div className="text-center">
                    <div className="text-2xl mb-2">📊</div>
                    <div className="font-semibold text-foreground">Excel</div>
                    <div className="text-xs text-muted mt-1">
                      Formatted with summaries
                    </div>
                  </div>
                </button>
              </div>
            </div>

            {/* Filters */}
            <div className="border-t border-border pt-6">
              <h3 className="text-lg font-semibold text-foreground mb-4">
                Filters
              </h3>

              {/* Account Filter */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-foreground mb-2">
                  Account
                </label>
                <select
                  value={selectedAccount}
                  onChange={(e) => setSelectedAccount(e.target.value)}
                  className="w-full px-4 py-3 bg-surface border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-foreground"
                  disabled={loading}
                >
                  <option value="all">All Accounts</option>
                  {accounts.map((account) => (
                    <option key={account.id} value={account.id}>
                      {account.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Date Range */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Start Date
                  </label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full px-4 py-3 bg-surface border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-foreground"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    End Date
                  </label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full px-4 py-3 bg-surface border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-foreground"
                  />
                </div>
              </div>
            </div>

            {/* Export Button */}
            <div className="border-t border-border pt-6">
              <button
                onClick={handleExport}
                disabled={exporting}
                className="w-full px-6 py-4 bg-primary text-white font-bold rounded-lg hover:bg-primary/90 transition-all shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {exporting ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Exporting...
                  </>
                ) : (
                  <>
                    <span className="text-xl">⬇</span>
                    Export {exportFormat.toUpperCase()}
                  </>
                )}
              </button>
            </div>

            {/* Info */}
            <div className="bg-primary/10 border border-primary/20 rounded-lg p-4">
              <h4 className="font-semibold text-primary mb-2">Export Details</h4>
              <ul className="text-sm text-muted space-y-1">
                <li>• CSV: Simple format, works in Excel, Google Sheets, etc.</li>
                <li>• Excel: Formatted with colors, totals, and summaries</li>
                <li>• All exports include: date, description, category, account, type, and amount</li>
              </ul>
            </div>
          </div>
        </Card>
      </div>
      </div>
    </>
  )
}
