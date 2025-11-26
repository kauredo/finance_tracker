'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useRouter } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'
import { useToast } from '@/contexts/ToastContext'
import NavBar from '@/components/NavBar'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import Icon from '@/components/icons/Icon'

interface HouseholdMember {
  user_id: string
  role: string
  joined_at: string
  profiles: {
    full_name: string
    email: string
  }
}

interface Household {
  id: string
  name: string
  created_at: string
}

export default function HouseholdPage() {
  const { user } = useAuth()
  const router = useRouter()
  const { success: showSuccess, error: showError } = useToast()
  const [loading, setLoading] = useState(true)
  const [household, setHousehold] = useState<Household | null>(null)
  const [members, setMembers] = useState<HouseholdMember[]>([])
  const [currentUserRole, setCurrentUserRole] = useState<string>('')

  useEffect(() => {
    if (user) {
      fetchHouseholdData()
    }
  }, [user])

  const fetchHouseholdData = async () => {
    try {
      const supabase = createClient()
      
      // Get user's household membership
      const { data: membership, error: membershipError } = await supabase
        .from('household_members')
        .select('household_id, role')
        .eq('user_id', user!.id)
        .single()

      if (membershipError || !membership) {
        // User is not in a household
        setLoading(false)
        return
      }

      setCurrentUserRole(membership.role)

      // Fetch household details
      const { data: householdData, error: householdError } = await supabase
        .from('households')
        .select('*')
        .eq('id', membership.household_id)
        .single()

      if (householdError) throw householdError
      setHousehold(householdData)

      // Fetch all household members
      const { data: membersData, error: membersError } = await supabase
        .from('household_members')
        .select(`
          user_id,
          role,
          joined_at,
          profiles:user_id (
            full_name,
            email
          )
        `)
        .eq('household_id', membership.household_id)
        .order('joined_at', { ascending: true })

      if (membersError) throw membersError
      setMembers(membersData || [])
    } catch (error) {
      console.error('Error fetching household:', error)
      showError('Failed to load household data')
    } finally {
      setLoading(false)
    }
  }

  const handleRemoveMember = async (userId: string) => {
    if (!household || currentUserRole !== 'owner') return

    if (!confirm('Are you sure you want to remove this member from the household?')) {
      return
    }

    try {
      const supabase = createClient()
      const { error } = await supabase
        .from('household_members')
        .delete()
        .eq('household_id', household.id)
        .eq('user_id', userId)

      if (error) throw error

      showSuccess('Member removed successfully')
      fetchHouseholdData()
    } catch (error) {
      console.error('Error removing member:', error)
      showError('Failed to remove member')
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <NavBar />
        <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="animate-pulse space-y-6">
            <div className="h-10 bg-surface-alt rounded w-1/3" />
            <div className="h-32 bg-surface-alt rounded" />
          </div>
        </main>
      </div>
    )
  }

  if (!household) {
    return (
      <div className="min-h-screen bg-background">
        <NavBar />
        <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Card className="text-center py-12">
            <CardContent>
              <Icon name="user" size={48} className="mx-auto mb-4 text-muted" />
              <h2 className="text-xl font-semibold text-foreground mb-2">No Household</h2>
              <p className="text-muted mb-6">
                You're not part of a household yet. Get invited to start collaborating!
              </p>
              <Button variant="secondary" onClick={() => router.push('/dashboard')}>
                Go to Dashboard
              </Button>
            </CardContent>
          </Card>
        </main>
      </div>
    )
  }

  const isOwner = currentUserRole === 'owner'

  return (
    <div className="min-h-screen bg-background">
      <NavBar />
      
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <button
            onClick={() => router.back()}
            className="text-muted hover:text-foreground transition-colors mb-4 inline-flex items-center gap-2"
          >
            <Icon name="arrow_back" size={20} />
            Back
          </button>
          <h1 className="text-3xl font-bold text-foreground">Household</h1>
          <p className="text-muted mt-1">Manage your household members and permissions</p>
        </div>

        {/* Household Info */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Household Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between">
              <span className="text-muted">Name</span>
              <span className="font-medium text-foreground">{household.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted">Members</span>
              <span className="font-medium text-foreground">{members.length}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted">Created</span>
              <span className="font-medium text-foreground">
                {new Date(household.created_at).toLocaleDateString()}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Members List */}
        <Card>
          <CardHeader>
            <CardTitle>Members</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {members.map((member) => {
                const profile = Array.isArray(member.profiles) ? member.profiles[0] : member.profiles
                const isCurrentUser = member.user_id === user!.id
                
                return (
                  <div
                    key={member.user_id}
                    className="flex items-center justify-between p-4 bg-surface border border-border rounded-lg"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <Icon name="user" size={20} className="text-primary" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-foreground">
                            {profile?.full_name || profile?.email || 'Unknown'}
                          </span>
                          {member.role === 'owner' && (
                            <span className="px-2 py-0.5 bg-primary/10 text-primary text-xs font-medium rounded-full">
                              Owner
                            </span>
                          )}
                          {isCurrentUser && (
                            <span className="px-2 py-0.5 bg-surface-alt text-muted text-xs font-medium rounded-full">
                              You
                            </span>
                          )}
                        </div>
                        <span className="text-sm text-muted">{profile?.email}</span>
                        <div className="text-xs text-muted mt-1">
                          Joined {new Date(member.joined_at).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                    
                    {isOwner && !isCurrentUser && member.role !== 'owner' && (
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => handleRemoveMember(member.user_id)}
                        className="text-red-500 hover:text-red-600"
                      >
                        Remove
                      </Button>
                    )}
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>

        {!isOwner && (
          <Card className="mt-6">
            <CardContent className="py-6">
              <div className="flex items-start gap-3">
                <Icon name="info" size={20} className="text-muted mt-0.5" />
                <div>
                  <p className="text-sm text-muted">
                    You are a member of this household. Only the owner can remove members.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  )
}
