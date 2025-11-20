import OpenAI from 'openai'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

export interface Transaction {
  date: string
  description: string
  amount: number
  category: string
}

export async function parseStatementWithAI(
  fileContent: string,
  fileType: 'csv' | 'pdf' | 'text'
): Promise<Transaction[]> {
  const prompt = `You are a financial data extraction expert. Parse the following bank statement and extract all transactions.
  
For each transaction, provide:
- date (ISO format YYYY-MM-DD)
- description (merchant/payee name)
- amount (negative for expenses, positive for income)
- category (one of: groceries, dining, transport, utilities, entertainment, shopping, healthcare, income, other)

File type: ${fileType}
Content (extracted text):
${fileContent}

Return ONLY valid JSON array of transactions, no markdown or explanations.`

  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.1,
    response_format: { type: 'json_object' },
  })

  const content = response.choices[0].message.content
  if (!content) throw new Error('No response from OpenAI')

  const parsed = JSON.parse(content)
  return parsed.transactions || []
}

export async function parseStatementWithVision(
  imageBase64Array: string[]
): Promise<Transaction[]> {
  const prompt = `Analyze this bank statement and extract ALL transactions.

Extract each transaction with:
- date (ISO format YYYY-MM-DD)
- description (merchant/payee name)
- amount (negative for expenses, positive for income)
- category (one of: groceries, dining, transport, utilities, entertainment, shopping, healthcare, income, other)

CRITICAL:
- Extract ALL transactions from ALL pages
- Pay attention to table columns
- Debits/expenses should be NEGATIVE amounts
- Credits/income should be POSITIVE amounts

You MUST respond with valid JSON only, in this EXACT format:
{"transactions": [{"date": "2024-01-15", "description": "Store", "amount": -45.50, "category": "shopping"}]}`

  const content: any[] = [
    { type: 'text', text: prompt }
  ]

  // Add all images
  for (const base64 of imageBase64Array) {
    content.push({
      type: 'image_url',
      image_url: {
        url: `data:image/png;base64,${base64}`,
      },
    })
  }

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'user',
          content,
        },
      ],
      temperature: 0.1,
      response_format: { type: 'json_object' },
    })

    const responseContent = response.choices[0].message.content
    
    console.log('OpenAI Vision Response:', responseContent)
    
    if (!responseContent) {
      throw new Error('No response from OpenAI')
    }

    // Clean up the response in case there's markdown
    let cleanContent = responseContent.trim()
    if (cleanContent.startsWith('```json')) {
      cleanContent = cleanContent.replace(/^```json\n/, '').replace(/\n```$/, '')
    } else if (cleanContent.startsWith('```')) {
      cleanContent = cleanContent.replace(/^```\n/, '').replace(/\n```$/, '')
    }

    const parsed = JSON.parse(cleanContent)
    return parsed.transactions || []
  } catch (error: any) {
    console.error('Vision API Error:', error)
    console.error('Error message:', error.message)
    throw new Error(`Failed to parse statement: ${error.message}`)
  }
}
