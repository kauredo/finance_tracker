'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/utils/supabase/client'
import { useAuth } from '@/contexts/AuthContext'
import { Card } from '@/components/ui/Card'

interface InvitePartnerModalProps {
  onClose: () => void
}

interface Household {
  id: string
  name: string
}

export default function InvitePartnerModal({ onClose }: InvitePartnerModalProps) {
  const { user } = useAuth()
  const [copied, setCopied] = useState(false)
  const [households, setHouseholds] = useState<Household[]>([])
  const [selectedHousehold, setSelectedHousehold] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [inviteLink, setInviteLink] = useState('')

  useEffect(() => {
    fetchHouseholds()
  }, [])

  useEffect(() => {
    if (selectedHousehold && typeof window !== 'undefined') {
      setInviteLink(`${window.location.origin}/join?household=${selectedHousehold}`)
    }
  }, [selectedHousehold])

  const fetchHouseholds = async () => {
    if (!user) return
    
    try {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('household_members')
        .select('household_id, households(id, name)')
        .eq('user_id', user.id)
        .eq('role', 'owner')

      if (error) throw error

      const householdList = data?.map(item => ({
        id: (item.households as any).id,
        name: (item.households as any).name
      })) || []

      setHouseholds(householdList)
      if (householdList.length > 0) {
        setSelectedHousehold(householdList[0].id)
      }
    } catch (error) {
      console.error('Error fetching households:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleCopyLink = () => {
    navigator.clipboard.writeText(inviteLink)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <Card variant="glass" className="w-full max-w-md">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-foreground">Invite Partner</h2>
          <button
            onClick={onClose}
            className="text-muted hover:text-foreground text-2xl"
          >
            ✕
          </button>
        </div>

        {loading ? (
          <div className="text-center py-8 text-muted">Loading...</div>
        ) : households.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-muted mb-4">You don't have any joint accounts yet.</p>
            <p className="text-sm text-text-secondary">Create a joint account first to invite your partner!</p>
          </div>
        ) : (
          <>
            <p className="text-foreground text-sm mb-6">
              Share this link with your partner so they can join your household and access joint accounts.
            </p>

            <div className="space-y-4">
              {/* Household Selector */}
              {households.length > 1 && (
                <div>
                  <label className="block text-foreground text-sm font-medium mb-2">
                    Household
                  </label>
                  <select
                    value={selectedHousehold}
                    onChange={(e) => setSelectedHousehold(e.target.value)}
                    className="w-full px-4 py-3 rounded-lg bg-surface border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-transparent"
                  >
                    {households.map(household => (
                      <option key={household.id} value={household.id} className="bg-surface">
                        {household.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Share Link */}
              <div>
                <label className="block text-foreground text-sm font-medium mb-2">
                  Invitation Link
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={inviteLink}
                    readOnly
                    className="flex-1 px-4 py-3 rounded-lg bg-surface border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 select-all"
                    onClick={(e) => e.currentTarget.select()}
                  />
                  <button
                    onClick={handleCopyLink}
                    className="px-4 py-3 bg-surface-alt hover:bg-background text-foreground rounded-lg transition-all border border-border"
                  >
                    {copied ? 'Copied!' : 'Copy'}
                  </button>
                </div>
                <p className="text-xs text-muted mt-2">
                  💡 Share via WhatsApp, email, or any messaging app
                </p>
              </div>
            </div>
          </>
        )}
      </Card>
    </div>
  )
}
