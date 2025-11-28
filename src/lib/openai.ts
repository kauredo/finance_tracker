import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export interface Transaction {
  date: string;
  description: string;
  amount: number;
  category: string;
}

export async function parseStatementWithAI(
  fileContent: string,
  fileType: "csv" | "text",
): Promise<Transaction[]> {
  const prompt = `You are a financial data extraction expert. Parse the following Portuguese bank statement and extract all transactions.

IMPORTANT RULES:
- The document is in Portuguese
- Transactions marked as "Débito" are money OUT (expenses) - these should have NEGATIVE amounts
- Transactions marked as "Crédito" are money IN (income) - these should have POSITIVE amounts
- Transaction descriptions may span multiple lines - combine them into a single description
- Each row contains a running account balance - ignore this balance column when extracting transactions
- The LAST row by date contains the final correct account balance (you can note this but focus on transactions)

For each transaction, provide:
- date (ISO format YYYY-MM-DD)
- description (merchant/payee name, combine multiline names into single string)
- amount (NEGATIVE for "Débito", POSITIVE for "Crédito")
- category (one of: groceries, dining, transport, utilities, entertainment, shopping, healthcare, income, other)

File type: ${fileType}
Content (extracted text or JSON):
${fileContent}

Return ONLY valid JSON array of transactions, no markdown or explanations.
Format: {"transactions": [{"date": "2024-01-15", "description": "Store Name", "amount": -45.50, "category": "shopping"}]}`;

  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [{ role: "user", content: prompt }],
    temperature: 0.1,
    response_format: { type: "json_object" },
  });

  const content = response.choices[0].message.content;
  if (!content) throw new Error("No response from OpenAI");

  const parsed = JSON.parse(content);
  return parsed.transactions || [];
}

export async function parseStatementWithVision(
  imageBase64Array: string[],
): Promise<Transaction[]> {
  const prompt = `Analyze this Portuguese bank statement and extract ALL transactions.

IMPORTANT RULES FOR PORTUGUESE BANK STATEMENTS:
- The document is in Portuguese
- Look for columns labeled "Débito" and "Crédito":
  * "Débito" = money OUT (expenses) - use NEGATIVE amounts (e.g., -50.00)
  * "Crédito" = money IN (income) - use POSITIVE amounts (e.g., +100.00)
- Transaction descriptions may span multiple lines - combine them into a single description
- Each row contains a running account balance (often labeled "Saldo") - ignore this when extracting transactions
- The LAST row by date contains the final correct account balance

Extract each transaction with:
- date (ISO format YYYY-MM-DD)
- description (merchant/payee name, combine any multiline text into single string)
- amount (NEGATIVE for "Débito", POSITIVE for "Crédito")
- category (one of: groceries, dining, transport, utilities, entertainment, shopping, healthcare, income, other)

CRITICAL:
- Extract ALL transactions from ALL pages
- Pay careful attention to which column the amount appears in (Débito vs Crédito)
- Transactions in "Débito" column should be NEGATIVE amounts
- Transactions in "Crédito" column should be POSITIVE amounts
- If a transaction description spans multiple lines, combine them

You MUST respond with valid JSON only, in this EXACT format:
{"transactions": [{"date": "2024-01-15", "description": "Store Name", "amount": -45.50, "category": "shopping"}]}`;

  const content: any[] = [{ type: "text", text: prompt }];

  // Add all images
  for (const base64 of imageBase64Array) {
    content.push({
      type: "image_url",
      image_url: {
        url: `data:image/png;base64,${base64}`,
      },
    });
  }

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "user",
          content,
        },
      ],
      temperature: 0.1,
      response_format: { type: "json_object" },
    });

    const responseContent = response.choices[0].message.content;

    console.log("OpenAI Vision Response:", responseContent);

    if (!responseContent) {
      throw new Error("No response from OpenAI");
    }

    // Clean up the response in case there's markdown
    let cleanContent = responseContent.trim();
    if (cleanContent.startsWith("```json")) {
      cleanContent = cleanContent
        .replace(/^```json\n/, "")
        .replace(/\n```$/, "");
    } else if (cleanContent.startsWith("```")) {
      cleanContent = cleanContent.replace(/^```\n/, "").replace(/\n```$/, "");
    }

    const parsed = JSON.parse(cleanContent);
    return parsed.transactions || [];
  } catch (error: any) {
    console.error("Vision API Error:", error);
    console.error("Error message:", error.message);
    throw new Error(`Failed to parse statement: ${error.message}`);
  }
}
