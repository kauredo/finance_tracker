import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { parseStatementWithAI } from '@/lib/openai'

export async function POST(req: NextRequest) {
  try {
    // 1. Check authentication
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return NextResponse.json({ error: 'Missing Authorization header' }, { status: 401 })
    }

    // 2. Initialize Supabase client with user's token to respect RLS
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY!,
      {
        global: {
          headers: {
            Authorization: authHeader,
          },
        },
      }
    )

    // 3. Get request body
    const { filePath, fileType, accountId } = await req.json()

    if (!filePath || !fileType || !accountId) {
      return NextResponse.json(
        { error: 'Missing required fields: filePath, fileType, accountId' },
        { status: 400 }
      )
    }

    // 4. Download file from Storage
    const { data: fileData, error: downloadError } = await supabase.storage
      .from('statements')
      .download(filePath)

    if (downloadError) {
      console.error('Storage download error:', downloadError)
      return NextResponse.json({ error: 'Failed to download file' }, { status: 500 })
    }

    // 5. Read file content
    const fileContent = await fileData.text()

    // 6. Parse with OpenAI
    const transactions = await parseStatementWithAI(fileContent, fileType)

    // 7. Save transactions to database
    // We'll map the AI result to our database schema
    const dbTransactions = transactions.map((t) => ({
      account_id: accountId,
      date: t.date,
      description: t.description,
      amount: t.amount,
      category: t.category,
      // We might want to store the statement_id if we had it, 
      // but for now we just link to account
    }))

    const { error: insertError } = await supabase
      .from('transactions')
      .insert(dbTransactions)

    if (insertError) {
      console.error('Database insert error:', insertError)
      return NextResponse.json({ error: 'Failed to save transactions' }, { status: 500 })
    }

    return NextResponse.json({ success: true, count: transactions.length })
  } catch (error: any) {
    console.error('API Error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal Server Error' },
      { status: 500 }
    )
  }
}
