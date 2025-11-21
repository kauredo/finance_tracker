'use client'

import { useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import NavBar from '@/components/NavBar'
import ReportsModal from '@/components/ReportsModal'

export default function ReportsPage() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/auth')
    }
  }, [user, authLoading, router])

  if (authLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-muted">Loading...</div>
      </div>
    )
  }

  return (
    <div key={pathname} className="min-h-screen bg-background">
      <NavBar />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-foreground">Financial Reports</h1>
          <p className="text-muted mt-1">Analyze your spending patterns and trends</p>
        </div>

        {/* TODO: Convert ReportsModal content to full page layout */}
        <div className="text-muted text-center py-12">
          <p>Reports page - Using ReportsModal component for now</p>
          <p className="text-sm mt-2">This will be converted to a full-page layout</p>
        </div>
      </main>
    </div>
  )
}
