import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createClient } from '@/utils/supabase/server'
import { addDays, addWeeks, addMonths, addYears, format } from 'date-fns'

export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    const supabase = createClient(cookieStore)

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user's household
    const { data: profile } = await supabase
      .from('profiles')
      .select('household_id')
      .eq('id', user.id)
      .single()

    if (!profile?.household_id) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }

    // Find due recurring transactions
    const today = new Date().toISOString().split('T')[0]
    
    const { data: dueTransactions, error: fetchError } = await supabase
      .from('recurring_transactions')
      .select('*')
      .eq('household_id', profile.household_id)
      .eq('active', true)
      .lte('next_run_date', today)

    if (fetchError) {
      console.error('Error fetching due transactions:', fetchError)
      return NextResponse.json({ error: 'Failed to fetch due transactions' }, { status: 500 })
    }

    if (!dueTransactions || dueTransactions.length === 0) {
      return NextResponse.json({ processed: 0 })
    }

    let processedCount = 0

    // Process each due transaction
    for (const recurring of dueTransactions) {
      // 1. Create actual transaction
      const { error: insertError } = await supabase
        .from('transactions')
        .insert({
          account_id: recurring.account_id,
          category_id: recurring.category_id,
          description: recurring.description,
          amount: recurring.amount,
          date: recurring.next_run_date,
          is_recurring: true
        })

      if (insertError) {
        console.error(`Error creating transaction for recurring ${recurring.id}:`, insertError)
        continue
      }

      // 2. Calculate next run date
      let nextDate = new Date(recurring.next_run_date)
      switch (recurring.interval) {
        case 'daily':
          nextDate = addDays(nextDate, 1)
          break
        case 'weekly':
          nextDate = addWeeks(nextDate, 1)
          break
        case 'monthly':
          nextDate = addMonths(nextDate, 1)
          break
        case 'yearly':
          nextDate = addYears(nextDate, 1)
          break
      }

      // 3. Update recurring transaction
      const { error: updateError } = await supabase
        .from('recurring_transactions')
        .update({
          last_run_date: recurring.next_run_date,
          next_run_date: format(nextDate, 'yyyy-MM-dd'),
          updated_at: new Date().toISOString()
        })
        .eq('id', recurring.id)

      if (updateError) {
        console.error(`Error updating recurring ${recurring.id}:`, updateError)
      } else {
        processedCount++
      }
    }

    return NextResponse.json({ processed: processedCount })
  } catch (error) {
    console.error('Error processing recurring transactions:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
