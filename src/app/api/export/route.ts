import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createClient } from '@/utils/supabase/server'
import ExcelJS from 'exceljs'
import { format } from 'date-fns'

export async function GET(request: NextRequest) {
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

    // Get query parameters
    const searchParams = request.nextUrl.searchParams
    const accountId = searchParams.get('accountId')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const exportFormat = searchParams.get('format') || 'csv' // csv, excel

    // Build query - RLS policies will handle access control
    let query = supabase
      .from('transactions')
      .select(`
        id,
        date,
        description,
        amount,
        account:accounts(name),
        category:categories(name)
      `)
      .order('date', { ascending: false })

    // Apply filters
    if (accountId) {
      query = query.eq('account_id', accountId)
    }

    if (startDate) {
      query = query.gte('date', startDate)
    }

    if (endDate) {
      query = query.lte('date', endDate)
    }

    const { data: transactions, error: transactionsError } = await query

    if (transactionsError) {
      console.error('Error fetching transactions:', transactionsError)
      return NextResponse.json(
        { error: 'Failed to fetch transactions' },
        { status: 500 }
      )
    }

    // Generate export based on format
    if (exportFormat === 'excel') {
      return await generateExcelExport(transactions)
    } else if (exportFormat === 'csv') {
      return generateCSVExport(transactions)
    } else {
      return NextResponse.json(
        { error: 'Unsupported format' },
        { status: 400 }
      )
    }
  } catch (error) {
    console.error('Error exporting data:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

function generateCSVExport(transactions: any[]) {
  // Create CSV content
  const headers = ['Date', 'Description', 'Category', 'Account', 'Type', 'Amount']
  const rows = transactions.map(t => {
    const type = parseFloat(t.amount) >= 0 ? 'income' : 'expense'
    return [
      t.date,
      t.description,
      t.category?.name || 'Uncategorized',
      t.account?.name || 'Unknown',
      type,
      Math.abs(parseFloat(t.amount)).toFixed(2)
    ]
  })

  const csv = [
    headers.join(','),
    ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
  ].join('\n')

  const filename = `transactions_${format(new Date(), 'yyyy-MM-dd')}.csv`

  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv',
      'Content-Disposition': `attachment; filename="${filename}"`
    }
  })
}

async function generateExcelExport(transactions: any[]) {
  const workbook = new ExcelJS.Workbook()
  const worksheet = workbook.addWorksheet('Transactions')

  // Add headers
  worksheet.columns = [
    { header: 'Date', key: 'date', width: 12 },
    { header: 'Description', key: 'description', width: 30 },
    { header: 'Category', key: 'category', width: 15 },
    { header: 'Account', key: 'account', width: 15 },
    { header: 'Type', key: 'type', width: 10 },
    { header: 'Amount', key: 'amount', width: 12 }
  ]

  // Style headers
  worksheet.getRow(1).font = { bold: true }
  worksheet.getRow(1).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFE0E0E0' }
  }

  // Add data rows
  transactions.forEach(t => {
    const amount = parseFloat(t.amount)
    const type = amount >= 0 ? 'income' : 'expense'
    const absAmount = Math.abs(amount)
    
    const row = worksheet.addRow({
      date: t.date,
      description: t.description,
      category: t.category?.name || 'Uncategorized',
      account: t.account?.name || 'Unknown',
      type: type,
      amount: absAmount
    })

    // Color code by type
    if (type === 'income') {
      row.getCell('amount').font = { color: { argb: 'FF22C55E' } }
    } else {
      row.getCell('amount').font = { color: { argb: 'FFEF4444' } }
    }

    // Format amount as currency
    row.getCell('amount').numFmt = '€#,##0.00'
  })

  // Add summary section
  const summaryRow = worksheet.addRow([])
  summaryRow.getCell(1).value = 'Summary'
  summaryRow.font = { bold: true }
  
  const totalIncome = transactions
    .filter(t => parseFloat(t.amount) >= 0)
    .reduce((sum, t) => sum + parseFloat(t.amount), 0)
  
  const totalExpenses = transactions
    .filter(t => parseFloat(t.amount) < 0)
    .reduce((sum, t) => sum + Math.abs(parseFloat(t.amount)), 0)

  worksheet.addRow(['Total Income', '', '', '', '', totalIncome])
  worksheet.addRow(['Total Expenses', '', '', '', '', totalExpenses])
  worksheet.addRow(['Net', '', '', '', '', totalIncome - totalExpenses])

  // Generate buffer
  const buffer = await workbook.xlsx.writeBuffer()
  const filename = `transactions_${format(new Date(), 'yyyy-MM-dd')}.xlsx`

  return new NextResponse(buffer, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="${filename}"`
    }
  })
}
