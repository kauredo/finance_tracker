import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(req: NextRequest) {
  try {
    // 1. Get auth token
    const authHeader = req.headers.get('authorization')
    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // 2. Create Supabase client with user's token
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    const token = authHeader.replace('Bearer ', '')
    
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: {
        headers: {
          Authorization: authHeader
        }
      }
    })

    // Verify user
    const { data: { user }, error: userError } = await supabase.auth.getUser(token)
    if (userError || !user) {
      return NextResponse.json({ error: 'Invalid user' }, { status: 401 })
    }

    // 3. Get household ID from request
    const { householdId } = await req.json()

    if (!householdId) {
      return NextResponse.json({ error: 'Missing householdId' }, { status: 400 })
    }

    // 4. Check if household exists
    const { data: household, error: householdError } = await supabase
      .from('households')
      .select('id')
      .eq('id', householdId)
      .single()

    if (householdError || !household) {
      return NextResponse.json({ error: 'Household not found' }, { status: 404 })
    }

    // 5. Check if user is already a member
    const { data: existingMember } = await supabase
      .from('household_members')
      .select('*')
      .eq('household_id', householdId)
      .eq('user_id', user.id)
      .single()

    if (existingMember) {
      return NextResponse.json({ error: 'Already a member of this household' }, { status: 400 })
    }

    // 6. Add user to household
    const { error: insertError } = await supabase
      .from('household_members')
      .insert({
        household_id: householdId,
        user_id: user.id,
        role: 'member'
      })

    if (insertError) {
      console.error('Error adding member:', insertError)
      return NextResponse.json({ error: 'Failed to join household' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('API Error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
