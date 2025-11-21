import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createClient } from '@/utils/supabase/server'

export async function GET() {
  try {
    const cookieStore = await cookies()
    const supabase = createClient(cookieStore)
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Get user's household from household_members
    const { data: member, error: memberError } = await supabase
      .from('household_members')
      .select('household_id')
      .eq('user_id', user.id)
      .single()

    if (memberError || !member?.household_id) {
      return NextResponse.json(
        { error: 'Household not found' },
        { status: 404 }
      )
    }

    const household_id = member.household_id

    // Fetch accounts for the household
    const { data: accounts, error: accountsError } = await supabase
      .from('accounts')
      .select('id, name, type, balance')
      .eq('household_id', household_id)
      .order('name')

    if (accountsError) {
      console.error('Error fetching accounts:', accountsError)
      return NextResponse.json(
        { error: 'Failed to fetch accounts' },
        { status: 500 }
      )
    }

    return NextResponse.json({ accounts })
  } catch (error) {
    console.error('Error in accounts API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
