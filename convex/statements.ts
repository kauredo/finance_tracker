import { action, mutation, query, internalMutation } from "./_generated/server";
import { v } from "convex/values";
import { api, internal } from "./_generated/api";
import { Id } from "./_generated/dataModel";
import { getAuthUserId } from "@convex-dev/auth/server";
import OpenAI from "openai";

/**
 * Generate an upload URL for file storage
 */
export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    // Verify user is authenticated
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Unauthorized");
    }
    return await ctx.storage.generateUploadUrl();
  },
});

/**
 * Internal query to get current user ID
 */
export const getCurrentUserId = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    return userId;
  },
});

/**
 * Process an uploaded statement file with AI
 */
export const processStatement = action({
  args: {
    storageId: v.id("_storage"),
    accountId: v.id("accounts"),
    fileName: v.string(),
    fileType: v.string(),
  },
  handler: async (ctx, args): Promise<{ success: boolean; transactionCount: number; statementId: string }> => {
    // Get current user
    const userId = await ctx.runQuery(api.statements.getCurrentUserId);
    if (!userId) {
      throw new Error("Unauthorized");
    }

    // Get the file from storage
    const fileUrl = await ctx.storage.getUrl(args.storageId);
    if (!fileUrl) {
      throw new Error("File not found in storage");
    }

    // Fetch the file content
    const response = await fetch(fileUrl);
    if (!response.ok) {
      throw new Error("Failed to fetch file from storage");
    }

    const fileExt = args.fileName.split(".").pop()?.toLowerCase() || "";
    let transactions: ParsedTransaction[] = [];

    // Process based on file type
    if (["csv", "tsv"].includes(fileExt)) {
      // Text-based files
      const text = await response.text();
      transactions = await parseStatementWithAI(text, fileExt as "csv" | "tsv");
    } else if (["png", "jpg", "jpeg"].includes(fileExt)) {
      // Image files
      const arrayBuffer = await response.arrayBuffer();
      const base64 = Buffer.from(arrayBuffer).toString("base64");
      transactions = await parseStatementWithVision([base64]);
    } else if (fileExt === "pdf") {
      // PDF files - convert to image approach or extract text
      // For now, we'll try the vision approach with PDF
      const arrayBuffer = await response.arrayBuffer();
      const base64 = Buffer.from(arrayBuffer).toString("base64");
      transactions = await parseStatementWithVision([base64]);
    } else {
      throw new Error(`Unsupported file type: ${fileExt}`);
    }

    if (transactions.length === 0) {
      throw new Error("No transactions found in the statement. Please check the file format.");
    }

    // Get categories to map names to IDs
    const categories = await ctx.runQuery(api.categories.list);
    const categoryMap = new Map<string, Id<"categories">>(
      categories.map((c: { name: string; _id: Id<"categories"> }) => [c.name.toLowerCase(), c._id])
    );

    // Find "other" category as fallback
    const otherCategoryId = categoryMap.get("other");

    // Map transactions to include category IDs
    const transactionsWithCategories = transactions.map((t) => {
      const categoryId = categoryMap.get(t.category.toLowerCase()) || otherCategoryId;
      return {
        date: t.date,
        description: t.description,
        amount: t.amount,
        categoryId: categoryId as Id<"categories"> | undefined,
        notes: `Imported from ${args.fileName}`,
      };
    });

    // Create the statement record first
    const statementId = await ctx.runMutation(internal.statements.createStatementRecord, {
      accountId: args.accountId,
      fileName: args.fileName,
      storageId: args.storageId,
      fileType: args.fileType,
      transactionCount: transactions.length,
      userId,
    });

    // Bulk create the transactions
    await ctx.runMutation(api.transactions.bulkCreate, {
      accountId: args.accountId,
      transactions: transactionsWithCategories,
    });

    return {
      success: true,
      transactionCount: transactions.length,
      statementId,
    };
  },
});

/**
 * Internal mutation to create statement record
 */
export const createStatementRecord = internalMutation({
  args: {
    accountId: v.id("accounts"),
    fileName: v.string(),
    storageId: v.id("_storage"),
    fileType: v.string(),
    transactionCount: v.number(),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("statements", {
      userId: args.userId,
      accountId: args.accountId,
      fileName: args.fileName,
      storageId: args.storageId,
      fileType: args.fileType,
      processed: true,
      transactionCount: args.transactionCount,
      createdAt: Date.now(),
    });
  },
});

/**
 * List statements for the current user
 */
export const list = query({
  args: {
    accountId: v.optional(v.id("accounts")),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return [];
    }

    let statementsQuery = ctx.db
      .query("statements")
      .withIndex("by_user", (q) => q.eq("userId", userId));

    const statements = await statementsQuery.collect();

    // Filter by account if specified
    if (args.accountId) {
      return statements.filter((s) => s.accountId === args.accountId);
    }

    return statements.sort((a, b) => b.createdAt - a.createdAt);
  },
});

// ============================================
// AI Parsing Functions
// ============================================

interface ParsedTransaction {
  date: string;
  description: string;
  amount: number;
  category: string;
}

async function parseStatementWithAI(
  fileContent: string,
  fileType: "csv" | "tsv"
): Promise<ParsedTransaction[]> {
  const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });

  const prompt = `You are a financial data extraction expert. Parse the following bank statement and extract all transactions.

IMPORTANT RULES:
- The document may be in Portuguese or English
- Transactions marked as "Débito" or "Debit" are money OUT (expenses) - these should have NEGATIVE amounts
- Transactions marked as "Crédito" or "Credit" are money IN (income) - these should have POSITIVE amounts
- Transaction descriptions may span multiple lines - combine them into a single description
- Each row may contain a running account balance - ignore this balance column when extracting transactions

For each transaction, provide:
- date (ISO format YYYY-MM-DD)
- description (merchant/payee name, combine multiline names into single string)
- amount (NEGATIVE for debits/expenses, POSITIVE for credits/income)
- category (one of: groceries, dining, transport, utilities, entertainment, shopping, healthcare, income, other)

File type: ${fileType}
Content:
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

async function parseStatementWithVision(
  imageBase64Array: string[]
): Promise<ParsedTransaction[]> {
  const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });

  const prompt = `Analyze this bank statement and extract ALL transactions.

IMPORTANT RULES:
- The document may be in Portuguese or English
- Look for columns indicating debits and credits:
  * "Débito" / "Debit" = money OUT (expenses) - use NEGATIVE amounts (e.g., -50.00)
  * "Crédito" / "Credit" = money IN (income) - use POSITIVE amounts (e.g., +100.00)
- Transaction descriptions may span multiple lines - combine them into a single description
- Ignore running balance columns

Extract each transaction with:
- date (ISO format YYYY-MM-DD)
- description (merchant/payee name, combine any multiline text into single string)
- amount (NEGATIVE for debits/expenses, POSITIVE for credits/income)
- category (one of: groceries, dining, transport, utilities, entertainment, shopping, healthcare, income, other)

CRITICAL:
- Extract ALL transactions from ALL pages
- Pay careful attention to which column the amount appears in
- Transactions in debit columns should be NEGATIVE amounts
- Transactions in credit columns should be POSITIVE amounts

You MUST respond with valid JSON only, in this EXACT format:
{"transactions": [{"date": "2024-01-15", "description": "Store Name", "amount": -45.50, "category": "shopping"}]}`;

  const content: OpenAI.Chat.ChatCompletionContentPart[] = [
    { type: "text", text: prompt },
  ];

  // Add all images
  for (const base64 of imageBase64Array) {
    content.push({
      type: "image_url",
      image_url: {
        url: `data:image/png;base64,${base64}`,
        detail: "high",
      },
    });
  }

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

  if (!responseContent) {
    throw new Error("No response from OpenAI");
  }

  // Clean up the response in case there's markdown
  let cleanContent = responseContent.trim();
  if (cleanContent.startsWith("```json")) {
    cleanContent = cleanContent.replace(/^```json\n/, "").replace(/\n```$/, "");
  } else if (cleanContent.startsWith("```")) {
    cleanContent = cleanContent.replace(/^```\n/, "").replace(/\n```$/, "");
  }

  const parsed = JSON.parse(cleanContent);
  return parsed.transactions || [];
}
