import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'

// GET /api/accounts/[id] - Get account details with balance and transactions
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createRouteHandlerClient({ cookies })
    
    // Check auth
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Fetch account
    const { data: account, error: accountError } = await supabase
      .from('accounts')
      .select('id, name, type, balance, created_at')
      .eq('id', params.id)
      .single()

    if (accountError) {
      if (accountError.code === 'PGRST116') {
        return NextResponse.json({ error: 'Account not found' }, { status: 404 })
      }
      throw accountError
    }

    return NextResponse.json({ account })
  } catch (error: any) {
    console.error('GET /api/accounts/[id] error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// PATCH /api/accounts/[id] - Update account
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createRouteHandlerClient({ cookies })
    
    // Check auth
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { name, type } = body

    // Build update object
    const updateData: any = {}
    if (name !== undefined) updateData.name = name
    if (type !== undefined) updateData.type = type

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('accounts')
      .update(updateData)
      .eq('id', params.id)
      .select('id, name, type, balance, created_at')
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Account not found' }, { status: 404 })
      }
      throw error
    }

    return NextResponse.json({ account: data })
  } catch (error: any) {
    console.error('PATCH /api/accounts/[id] error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// DELETE /api/accounts/[id] - Delete account (with transaction check)
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createRouteHandlerClient({ cookies })
    
    // Check auth
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if account has transactions
    const { data: transactions, error: txError } = await supabase
      .from('transactions')
      .select('id')
      .eq('account_id', params.id)
      .limit(1)

    if (txError) throw txError

    if (transactions && transactions.length > 0) {
      return NextResponse.json({ 
        error: 'Cannot delete account with existing transactions. Please delete transactions first.' 
      }, { status: 400 })
    }

    // Delete account
    const { error } = await supabase
      .from('accounts')
      .delete()
      .eq('id', params.id)

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('DELETE /api/accounts/[id] error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
