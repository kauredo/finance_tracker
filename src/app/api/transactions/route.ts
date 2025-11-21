import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { cookies } from 'next/headers'

// GET /api/transactions - List transactions with filters
export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    console.log('API: Cookies found:', cookieStore.getAll().map(c => c.name))
    const supabase = createClient(cookieStore)
    const { searchParams } = new URL(request.url)
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    console.log('API: User found:', user?.id)
    console.log('API: Auth error:', authError)
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Parse query parameters
    const accountId = searchParams.get('account_id')
    const categoryId = searchParams.get('category_id')
    const dateFrom = searchParams.get('date_from')
    const dateTo = searchParams.get('date_to')
    const search = searchParams.get('search')
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')

    // Build query
    let query = supabase
      .from('transactions')
      .select(`
        id,
        date,
        description,
        amount,
        category:categories(id,name,color,icon),
        account:accounts(id,name,type),
        created_at
      `)
      .order('date', { ascending: false })

    // Apply filters
    if (accountId) {
      query = query.eq('account_id', accountId)
    }
    if (categoryId) {
      query = query.eq('category_id', categoryId)
    }
    if (dateFrom) {
      query = query.gte('date', dateFrom)
    }
    if (dateTo) {
      query = query.lte('date', dateTo)
    }
    if (search) {
      query = query.ilike('description', `%${search}%`)
    }

    // Apply pagination
    query = query.range(offset, offset + limit - 1)

    const { data, error, count } = await query

    if (error) throw error

    return NextResponse.json({ 
      transactions: data,
      count,
      limit,
      offset
    })
  } catch (error: any) {
    console.error('GET /api/transactions error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// POST /api/transactions - Create new transaction
export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    const supabase = createClient(cookieStore)
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { date, description, amount, category_id, account_id } = body

    // Validate required fields
    if (!date || !description || !amount || !account_id) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('transactions')
      .insert([
        {
          date,
          description,
          amount,
          category_id: category_id || null,
          account_id,
          user_id: user.id // Explicitly set user_id from auth context
        }
      ])
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ transaction: data }, { status: 201 })
  } catch (error: any) {
    console.error('POST /api/transactions error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
