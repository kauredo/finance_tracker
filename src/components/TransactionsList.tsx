'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { createClient } from '@/utils/supabase/client'
import TransactionDetailModal from '@/components/TransactionDetailModal'
import Icon from '@/components/icons/Icon'
import { SkeletonTable } from '@/components/ui/Skeleton'
import { Pagination } from '@/components/ui/Pagination'

interface Transaction {
  id: string
  date: string
  description: string
  amount: number
  category: {
    name: string
    color: string
    icon: string
  } | null
  account: {
    name: string
  }
  notes?: string | null
}

interface TransactionsListProps {
  searchQuery?: string
  accountFilter?: string
  categoryFilter?: string
  startDate?: string
  endDate?: string
  limit?: number
}

export default function TransactionsList({ 
  searchQuery = '',
  accountFilter = 'all',
  categoryFilter = 'all',
  startDate,
  endDate,
  limit = 100
}: TransactionsListProps = {}) {
  const { user } = useAuth()
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true) 
  const [selectedTransactionId, setSelectedTransactionId] = useState<string | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(10)
  const [totalCount, setTotalCount] = useState(0)

  useEffect(() => {
    if (user) {
      setCurrentPage(1) // Reset to page 1 when filters change
      fetchTransactions()
    }
  }, [user, searchQuery, accountFilter, categoryFilter, startDate, endDate])

  useEffect(() => {
    if (user) {
      fetchTransactions()
    }
  }, [currentPage, itemsPerPage])

  const fetchTransactions = async () => {
    try {
      const supabase = createClient()
      
      // First, get total count
      let countQuery = supabase
        .from('transactions')
        .select('*', { count: 'exact', head: true })

      // Build the main query
      let query = supabase
        .from('transactions')
        .select(`
          id,
          date,
          description,
          amount,
          notes,
          category:categories(name,color,icon),
          account:accounts(name,id)
        `)
        .order('date', { ascending: false })

      // Apply search filter to both queries
      if (searchQuery) {
        query = query.ilike('description', `%${searchQuery}%`)
        countQuery = countQuery.ilike('description', `%${searchQuery}%`)
      }

      // Apply account filter
      if (accountFilter && accountFilter !== 'all') {
        query = query.eq('account_id', accountFilter)
        countQuery = countQuery.eq('account_id', accountFilter)
      }

      // Apply category filter  
      if (categoryFilter && categoryFilter !== 'all') {
        query = query.eq('category_id', categoryFilter)
        countQuery = countQuery.eq('category_id', categoryFilter)
      }

      // Apply date range filters
      if (startDate) {
        query = query.gte('date', startDate)
        countQuery = countQuery.gte('date', startDate)
      }
      if (endDate) {
        query = query.lte('date', endDate)
        countQuery = countQuery.lte('date', endDate)
      }

      // Apply pagination
      const from = (currentPage - 1) * itemsPerPage
      const to = from + itemsPerPage - 1
      query = query.range(from, to)

      // Execute both queries
      const [{ data, error }, { count }] = await Promise.all([
        query,
        countQuery
      ])

      if (error) throw error
      
      // Supabase might return account as an array if not properly typed, but we know it's a single relation
      const formattedData = (data || []).map((t: any) => ({
        ...t,
        account: Array.isArray(t.account) ? t.account[0] : t.account
      })) as unknown as Transaction[]
      
      setTransactions(formattedData)
      setTotalCount(count || 0)
    } catch (error) {
      console.error('Error fetching transactions:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return <SkeletonTable rows={5} columns={5} />
  }

  if (transactions.length === 0) {
    return (
      <div className="text-center py-12 text-muted">
        <Icon name="memo" size={48} className="mb-4 mx-auto" />
        <p className="text-lg font-medium">No transactions yet</p>
        <p className="text-sm mt-2">Upload a bank statement to get started</p>
      </div>
    )
  }

  return (
    <>
    <div className="hidden md:block overflow-x-auto">
      <table className="w-full text-left">
        <thead>
          <tr className="border-b border-border text-muted text-sm">
            <th className="pb-3 font-medium">Date</th>
            <th className="pb-3 font-medium">Description</th>
            <th className="pb-3 font-medium">Category</th>
            <th className="pb-3 font-medium">Account</th>
            <th className="pb-3 font-medium text-right">Amount</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {transactions.map((t) => (
            <tr 
              key={t.id} 
              onClick={() => setSelectedTransactionId(t.id)}
              className="group hover:bg-white/5 transition-colors cursor-pointer"
            >
              <td className="py-4 text-sm text-muted">{new Date(t.date).toLocaleDateString()}</td>
              <td className="py-4 text-foreground font-medium">{t.description}</td>
              <td className="py-4">
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-surface-alt text-foreground capitalize border border-border">
                  <Icon name={t.category?.icon as any || 'other'} size={14} className="mr-1.5" />
                  {t.category?.name || 'Uncategorized'}
                </span>
              </td>
              <td className="py-4 text-sm text-muted">{t.account?.name || 'Unknown'}</td>
              <td className={`py-4 text-right font-medium ${t.amount > 0 ? 'text-success' : 'text-foreground'}`}>
                {t.amount > 0 ? '+' : ''}€{t.amount.toFixed(2)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>

    {/* Mobile Card View */}
    <div className="md:hidden space-y-3">
      {transactions.map((t) => (
        <div 
          key={t.id}
          onClick={() => setSelectedTransactionId(t.id)}
          className="bg-surface border border-border rounded-xl p-4 active:scale-[0.98] transition-transform cursor-pointer"
        >
          <div className="flex justify-between items-start mb-2">
            <span className="text-xs text-muted">{new Date(t.date).toLocaleDateString()}</span>
            <span className={`font-semibold ${t.amount > 0 ? 'text-success' : 'text-foreground'}`}>
              {t.amount > 0 ? '+' : ''}€{t.amount.toFixed(2)}
            </span>
          </div>
          
          <h3 className="font-medium text-foreground mb-3">{t.description}</h3>
          
          <div className="flex justify-between items-center">
            <span className="inline-flex items-center px-2 py-1 rounded-lg text-xs font-medium bg-surface-alt text-muted-foreground border border-border/50">
              <Icon name={t.category?.icon as any || 'other'} size={12} className="mr-1.5" />
              {t.category?.name || 'Uncategorized'}
            </span>
            <span className="text-xs text-muted">
              {t.account?.name || 'Unknown'}
            </span>
          </div>
          
          {t.notes && (
            <div className="mt-2 pt-2 border-t border-border">
              <p className="text-xs text-muted line-clamp-2">
                <Icon name="memo" size={12} className="inline mr-1" />
                {t.notes}
              </p>
            </div>
          )}
        </div>
      ))}
    </div>
      
      {/* Pagination */}
      <Pagination
        currentPage={currentPage}
        totalPages={Math.ceil(totalCount / itemsPerPage)}
        totalItems={totalCount}
        itemsPerPage={itemsPerPage}
        onPageChange={setCurrentPage}
        onItemsPerPageChange={(newItemsPerPage) => {
          setItemsPerPage(newItemsPerPage)
          setCurrentPage(1) // Reset to first page when changing items per page
        }}
      />


    {/* Transaction Detail Modal */}
    {selectedTransactionId && (
      <TransactionDetailModal
        transactionId={selectedTransactionId!}
        onClose={() => setSelectedTransactionId(null)}
        onUpdate={() => {
          setSelectedTransactionId(null)
          fetchTransactions() // Refresh list after edit/delete
        }}
      />
    )}
  </>
  )
}
