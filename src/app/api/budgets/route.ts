import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createClient } from '@/utils/supabase/server'

export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    const supabase = createClient(cookieStore)

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user's household from household_members
    const { data: member } = await supabase
      .from('household_members')
      .select('household_id')
      .eq('user_id', user.id)
      .single()

    if (!member?.household_id) {
      return NextResponse.json({ error: 'Household not found' }, { status: 404 })
    }

    const household_id = member.household_id

    // Fetch budgets with category details
    const { data: budgets, error } = await supabase
      .from('budgets')
      .select(`
        *,
        category:categories(id, name, icon, color)
      `)
      .eq('household_id', household_id)

    if (error) {
      console.error('Error fetching budgets:', error)
      return NextResponse.json({ error: 'Failed to fetch budgets' }, { status: 500 })
    }

    return NextResponse.json({ budgets })
  } catch (error) {
    console.error('Error in budgets API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    const supabase = createClient(cookieStore)

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { category_id, amount, period = 'monthly' } = body

    if (!category_id || !amount) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Get user's household from household_members
    const { data: member } = await supabase
      .from('household_members')
      .select('household_id')
      .eq('user_id', user.id)
      .single()

    if (!member?.household_id) {
      return NextResponse.json({ error: 'Household not found' }, { status: 404 })
    }

    const household_id = member.household_id

    // Upsert budget
    const { data: budget, error } = await supabase
      .from('budgets')
      .upsert({
        household_id: household_id,
        category_id,
        amount,
        period
      }, {
        onConflict: 'household_id, category_id'
      })
      .select()
      .single()

    if (error) {
      console.error('Error saving budget:', error)
      return NextResponse.json({ error: 'Failed to save budget' }, { status: 500 })
    }

    return NextResponse.json({ budget })
  } catch (error) {
    console.error('Error in budgets API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
