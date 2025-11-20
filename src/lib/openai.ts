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
Content:
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
