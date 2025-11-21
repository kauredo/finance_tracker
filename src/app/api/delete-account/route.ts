import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createClient } from '@/utils/supabase/server'

export async function DELETE(request: Request) {
  try {
    const { accountId } = await request.json()

    if (!accountId) {
      return NextResponse.json(
        { error: 'Account ID is required' },
        { status: 400 }
      )
    }

    const cookieStore = await cookies()
    const supabase = createClient(cookieStore)

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify user owns or has access to this account
    const { data: account, error: fetchError } = await supabase
      .from('accounts')
      .select('id, owner_id, household_id')
      .eq('id', accountId)
      .single()

    if (fetchError || !account) {
      return NextResponse.json({ error: 'Account not found' }, { status: 404 })
    }

    // Check if user has access (owner or household member)
    let hasAccess = account.owner_id === user.id

    if (!hasAccess && account.household_id) {
      const { data: household } = await supabase
        .from('household_members')
        .select('user_id')
        .eq('household_id', account.household_id)
        .eq('user_id', user.id)
        .single()

      hasAccess = !!household
    }

    if (!hasAccess) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    // Check if account has transactions
    const { count: transactionCount } = await supabase
      .from('transactions')
      .select('*', { count: 'exact', head: true })
      .eq('account_id', accountId)

    if (transactionCount && transactionCount > 0) {
      return NextResponse.json(
        { 
          error: `Cannot delete account with ${transactionCount} transaction${transactionCount > 1 ? 's' : ''}. Please delete or move the transactions first.`,
          transactionCount 
        },
        { status: 400 }
      )
    }

    // Delete the account
    const { error: deleteError } = await supabase
      .from('accounts')
      .delete()
      .eq('id', accountId)

    if (deleteError) {
      console.error('Error deleting account:', deleteError)
      return NextResponse.json(
        { error: 'Failed to delete account' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error in delete-account:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
