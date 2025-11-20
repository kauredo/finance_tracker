import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { parseStatementWithVision } from '@/lib/openai'

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
    const { files, accountId } = await req.json()

    if (!files || !Array.isArray(files) || files.length === 0 || !accountId) {
      return NextResponse.json(
        { error: 'Missing required fields: files (array), accountId' },
        { status: 400 }
      )
    }

    // Validate all file types (images only)
    for (const file of files) {
      if (!['image/png', 'image/jpeg', 'image/jpg'].includes(file.fileType)) {
        return NextResponse.json(
          { error: 'Only PNG and JPEG images are supported. Please upload an image of your statement.' },
          { status: 400 }
        )
      }
    }

    // 4. Download all files from Storage and convert to base64
    const base64Images: string[] = []
    
    for (const file of files) {
      const { data: fileData, error: downloadError } = await supabase.storage
        .from('statements')
        .download(file.filePath)

      if (downloadError) {
        console.error('Storage download error:', downloadError)
        return NextResponse.json({ error: 'Failed to download file' }, { status: 500 })
      }

      console.log(`Processing image ${file.filePath}, size:`, fileData.size, 'bytes')
      const arrayBuffer = await fileData.arrayBuffer()
      const base64Image = Buffer.from(arrayBuffer).toString('base64')
      base64Images.push(base64Image)
      console.log(`Image ${file.filePath} converted, base64 length:`, base64Image.length)
    }

    // 5. Parse with Vision API
    console.log(`Calling vision API with ${base64Images.length} image(s)...`)
    const transactions = await parseStatementWithVision(base64Images)
    console.log('Extracted transactions:', transactions.length)

    // 7. Get categories to map names to IDs
    const { data: categories } = await supabase
      .from('categories')
      .select('id, name')

    const categoryMap = new Map(
      categories?.map((c) => [c.name.toLowerCase(), c.id]) || []
    )

    // 8. Save transactions to database
    // We'll map the AI result to our database schema
    const dbTransactions = transactions.map((t) => {
      const categoryId = categoryMap.get(t.category.toLowerCase()) || categoryMap.get('other')
      
      return {
        account_id: accountId,
        date: t.date,
        description: t.description,
        amount: t.amount,
        category_id: categoryId,
      }
    })

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
