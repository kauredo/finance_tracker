import { action, mutation, query, internalMutation } from "./_generated/server";
import { v } from "convex/values";
import { api, internal } from "./_generated/api";
import { Id } from "./_generated/dataModel";
import { getAuthUserId } from "@convex-dev/auth/server";
import OpenAI from "openai";

// ============================================
// Configuration
// ============================================

const OPENAI_MODEL = "gpt-4o";
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 1000;

const TRANSACTION_SCHEMA = {
  name: "statement_transactions",
  strict: true,
  schema: {
    type: "object" as const,
    properties: {
      transactions: {
        type: "array" as const,
        items: {
          type: "object" as const,
          properties: {
            date: { type: "string" as const },
            description: { type: "string" as const },
            amount: { type: "number" as const },
            category: { type: "string" as const },
          },
          required: ["date", "description", "amount", "category"],
          additionalProperties: false,
        },
      },
    },
    required: ["transactions"],
    additionalProperties: false,
  },
};

// ============================================
// Mutations and Queries
// ============================================

/**
 * Generate an upload URL for file storage
 */
export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
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
 * Parse a statement and return extracted transactions for review (no commit).
 */
export const parseStatement = action({
  args: {
    storageId: v.id("_storage"),
    accountId: v.id("accounts"),
    fileName: v.string(),
    fileType: v.string(),
  },
  handler: async (
    ctx,
    args,
  ): Promise<{
    preview: Array<{
      date: string;
      description: string;
      amount: number;
      category: string;
      categoryId: Id<"categories"> | undefined;
      isDuplicate: boolean;
    }>;
    availableCategories: Array<{ id: Id<"categories">; name: string }>;
    storageId: Id<"_storage">;
    wasTruncated: boolean;
  }> => {
    const userId = await ctx.runQuery(api.statements.getCurrentUserId);
    if (!userId) throw new Error("Unauthorized");

    // Fetch user's categories first so we can pass them to the AI
    const categories = await ctx.runQuery(api.categories.list);
    const categoryNames = categories.map((c: { name: string }) => c.name);

    const fileUrl = await ctx.storage.getUrl(args.storageId);
    if (!fileUrl) throw new Error("File not found in storage");

    const response = await fetch(fileUrl);
    if (!response.ok) throw new Error("Failed to fetch file from storage");

    const fileExt = args.fileName.split(".").pop()?.toLowerCase() || "";
    let transactions: ParsedTransaction[] = [];
    let wasTruncated = false;

    if (["csv", "tsv"].includes(fileExt)) {
      const arrayBuffer = await response.arrayBuffer();
      const text = decodeTextWithFallback(arrayBuffer);
      const result = await parseStatementWithAI(
        text,
        fileExt as "csv" | "tsv",
        categoryNames,
      );
      transactions = result.transactions;
      wasTruncated = result.wasTruncated;
    } else if (["png", "jpg", "jpeg"].includes(fileExt)) {
      const arrayBuffer = await response.arrayBuffer();
      const bytes = new Uint8Array(arrayBuffer);
      let binary = "";
      for (let i = 0; i < bytes.length; i++) {
        binary += String.fromCharCode(bytes[i]);
      }
      const base64 = btoa(binary);
      const mimeType = fileExt === "png" ? "image/png" : "image/jpeg";
      transactions = await parseStatementWithVision(
        [{ base64, mimeType }],
        categoryNames,
      );
    } else if (fileExt === "pdf") {
      const pdfText = await ctx.runAction(
        internal.statementsNode.extractPdfText,
        { storageId: args.storageId },
      );
      if (!pdfText || pdfText.trim().length < 50) {
        throw new Error(
          "Could not extract text from this PDF. It may be a scanned document. Please upload a CSV export or images of individual pages instead.",
        );
      }
      const result = await parseStatementWithAI(
        pdfText,
        "text",
        categoryNames,
      );
      transactions = result.transactions;
      wasTruncated = result.wasTruncated;
    } else {
      throw new Error(`Unsupported file type: ${fileExt}`);
    }

    const validatedTransactions = validateTransactions(transactions);
    if (validatedTransactions.length === 0) {
      const count = transactions.length;
      throw new Error(
        count > 0
          ? `Extracted ${count} transaction${count === 1 ? "" : "s"} but none passed validation. Common issues: dates not in a recognized format, zero amounts, or descriptions shorter than 2 characters.`
          : "No transactions found in the statement. The file may not contain a recognizable transactions table.",
      );
    }
    const categoryMap = new Map<string, { id: Id<"categories">; name: string }>(
      categories.map((c: { name: string; _id: Id<"categories"> }) => [
        c.name.toLowerCase(),
        { id: c._id, name: c.name },
      ]),
    );
    const otherCategory = categoryMap.get("other");

    // Check for duplicates (high limit to catch older entries)
    const existingTransactions = await ctx.runQuery(api.transactions.list, {
      accountId: args.accountId,
      limit: 10000,
      offset: 0,
    });
    const existingSet = new Set(
      (existingTransactions?.transactions || []).map(
        (t: { date: string; amount: number; description: string }) =>
          `${t.date}|${t.amount}|${t.description.toLowerCase().slice(0, 30)}`,
      ),
    );

    // Return transactions with duplicate flags and category info
    const preview = validatedTransactions.map((t) => {
      const key = `${t.date}|${t.amount}|${t.description.toLowerCase().slice(0, 30)}`;
      const isDuplicate = existingSet.has(key);
      const mapped = categoryMap.get(t.category.toLowerCase());
      return {
        date: t.date,
        description: t.description,
        amount: t.amount,
        category: mapped?.name || otherCategory?.name || "Other",
        categoryId: mapped?.id || otherCategory?.id || undefined,
        isDuplicate,
      };
    });

    // Also return available categories for the review UI
    const availableCategories = categories.map(
      (c: { _id: Id<"categories">; name: string }) => ({
        id: c._id,
        name: c.name,
      }),
    );

    return {
      preview,
      availableCategories,
      storageId: args.storageId,
      wasTruncated,
    };
  },
});

/**
 * Commit reviewed transactions from a parsed statement.
 */
export const commitStatement = action({
  args: {
    storageId: v.id("_storage"),
    accountId: v.id("accounts"),
    fileName: v.string(),
    fileType: v.string(),
    transactions: v.array(
      v.object({
        date: v.string(),
        description: v.string(),
        amount: v.number(),
        categoryId: v.optional(v.id("categories")),
      }),
    ),
  },
  handler: async (
    ctx,
    args,
  ): Promise<{
    success: boolean;
    transactionCount: number;
    statementId: string;
  }> => {
    const userId = await ctx.runQuery(api.statements.getCurrentUserId);
    if (!userId) throw new Error("Unauthorized");

    if (args.transactions.length === 0) {
      throw new Error("No transactions selected for import.");
    }

    const MAX_TRANSACTIONS = 500;
    if (args.transactions.length > MAX_TRANSACTIONS) {
      throw new Error(
        `Too many transactions (${args.transactions.length}). Maximum is ${MAX_TRANSACTIONS} per upload.`,
      );
    }

    // Validate each transaction before saving
    for (const t of args.transactions) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(t.date)) {
        throw new Error(
          `Invalid date format: "${t.date}". Expected YYYY-MM-DD.`,
        );
      }
      if (!t.description || t.description.trim().length < 2) {
        throw new Error(
          `Description too short: "${t.description}". Must be at least 2 characters.`,
        );
      }
      if (!isFinite(t.amount) || t.amount === 0) {
        throw new Error(
          `Invalid amount: ${t.amount}. Must be a non-zero number.`,
        );
      }
    }

    const transactionsWithNotes = args.transactions.map((t) => ({
      ...t,
      notes: `Imported from ${args.fileName}`,
    }));

    const statementId = await ctx.runMutation(
      internal.statements.createStatementRecord,
      {
        accountId: args.accountId,
        fileName: args.fileName,
        storageId: args.storageId,
        fileType: args.fileType,
        transactionCount: transactionsWithNotes.length,
        userId,
      },
    );

    await ctx.runMutation(api.transactions.bulkCreate, {
      accountId: args.accountId,
      transactions: transactionsWithNotes,
    });

    return {
      success: true,
      transactionCount: transactionsWithNotes.length,
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

    const statementsQuery = ctx.db
      .query("statements")
      .withIndex("by_user", (q) => q.eq("userId", userId));

    const statements = await statementsQuery.collect();

    if (args.accountId) {
      return statements.filter((s) => s.accountId === args.accountId);
    }

    return statements.sort((a, b) => b.createdAt - a.createdAt);
  },
});

// ============================================
// Helper Functions
// ============================================

/**
 * Decode text with fallback encodings for non-UTF8 files
 */
function decodeTextWithFallback(arrayBuffer: ArrayBuffer): string {
  const uint8Array = new Uint8Array(arrayBuffer);

  // Try UTF-8 first
  try {
    const decoder = new TextDecoder("utf-8", { fatal: true });
    return decoder.decode(uint8Array);
  } catch {
    // Fall back to ISO-8859-1 (Latin-1) - common for European files
    try {
      const decoder = new TextDecoder("iso-8859-1");
      return decoder.decode(uint8Array);
    } catch {
      // Last resort: Windows-1252
      const decoder = new TextDecoder("windows-1252");
      return decoder.decode(uint8Array);
    }
  }
}

// ============================================
// Transaction Validation
// ============================================

interface ParsedTransaction {
  date: string;
  description: string;
  amount: number;
  category: string;
}

interface ImageData {
  base64: string;
  mimeType: string;
}

/**
 * Validate and clean parsed transactions
 */
function validateTransactions(
  transactions: ParsedTransaction[],
): ParsedTransaction[] {
  return transactions
    .map((t) => {
      // Validate and fix date
      const date = validateAndFixDate(t.date);
      if (!date) return null;

      // Validate amount
      const amount = validateAmount(t.amount);
      if (amount === null) return null;

      // Clean description
      const description = cleanDescription(t.description);
      if (!description) return null;

      return {
        date,
        description,
        amount,
        category: (t.category || "Other").trim(),
      };
    })
    .filter((t): t is ParsedTransaction => t !== null);
}

/**
 * Validate and fix date format
 */
function validateAndFixDate(dateStr: string): string | null {
  if (!dateStr) return null;

  // Already in ISO format
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    const date = new Date(dateStr);
    if (!isNaN(date.getTime())) return dateStr;
  }

  // Try common European formats (DD/MM/YYYY, DD-MM-YYYY)
  const euroMatch = dateStr.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{4})$/);
  if (euroMatch) {
    const [, day, month, year] = euroMatch;
    const isoDate = `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
    const date = new Date(isoDate);
    if (!isNaN(date.getTime())) return isoDate;
  }

  // Try American format (MM/DD/YYYY)
  const usMatch = dateStr.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{4})$/);
  if (usMatch) {
    const [, month, day, year] = usMatch;
    // Only use US format if month > 12 (clearly a day) or explicit US context
    if (parseInt(month) <= 12 && parseInt(day) <= 12) {
      // Ambiguous - prefer European format (already handled above)
      return null;
    }
    const isoDate = `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
    const date = new Date(isoDate);
    if (!isNaN(date.getTime())) return isoDate;
  }

  // Try parsing with Date constructor as last resort
  try {
    const date = new Date(dateStr);
    if (!isNaN(date.getTime())) {
      return date.toISOString().split("T")[0];
    }
  } catch {
    // Ignore
  }

  return null;
}

/**
 * Validate and normalize amount
 */
function validateAmount(amount: unknown): number | null {
  if (typeof amount === "number") {
    if (isNaN(amount) || !isFinite(amount)) return null;
    return Math.round(amount * 100) / 100;
  }

  if (typeof amount === "string") {
    // Handle European format (1.234,56 or 1 234,56)
    let normalized = amount
      .replace(/\s/g, "") // Remove spaces
      .replace(/[€$£]/g, "") // Remove currency symbols
      .trim();

    // If it has comma as decimal separator
    if (/,\d{2}$/.test(normalized) && normalized.includes(".")) {
      // European format: 1.234,56 -> 1234.56
      normalized = normalized.replace(/\./g, "").replace(",", ".");
    } else if (/,\d{2}$/.test(normalized)) {
      // Just comma decimal: 1234,56 -> 1234.56
      normalized = normalized.replace(",", ".");
    }

    const parsed = parseFloat(normalized);
    if (isNaN(parsed) || !isFinite(parsed)) return null;
    return Math.round(parsed * 100) / 100;
  }

  return null;
}

/**
 * Clean and validate description
 */
function cleanDescription(description: string): string | null {
  if (!description || typeof description !== "string") return null;

  const cleaned = description
    .replace(/\s+/g, " ") // Normalize whitespace
    .replace(/[^\x20-\x7E\xA0-\xFF]/g, "") // Remove control characters
    .trim();

  if (cleaned.length < 2) return null;
  if (cleaned.length > 200) return cleaned.slice(0, 200);

  return cleaned;
}

// ============================================
// AI Parsing Functions with Retry Logic
// ============================================

/**
 * Sleep helper for retry delays
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Retry wrapper for API calls
 */
async function withRetry<T>(
  fn: () => Promise<T>,
  maxRetries: number = MAX_RETRIES,
): Promise<T> {
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;
      console.error(`Attempt ${attempt}/${maxRetries} failed:`, error);

      if (attempt < maxRetries) {
        await sleep(RETRY_DELAY_MS * attempt);
      }
    }
  }

  throw lastError || new Error("All retry attempts failed");
}

/**
 * Parse statement with AI (text-based files)
 */
async function parseStatementWithAI(
  fileContent: string,
  fileType: "csv" | "tsv" | "text",
  categoryNames: string[],
): Promise<{ transactions: ParsedTransaction[]; wasTruncated: boolean }> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error(
      "OpenAI API key not configured. Please set OPENAI_API_KEY in your Convex environment.",
    );
  }

  const openai = new OpenAI({ apiKey });

  const maxLength = 50000;
  const wasTruncated = fileContent.length > maxLength;
  const truncatedContent = wasTruncated
    ? fileContent.slice(0, maxLength) + "\n... (truncated)"
    : fileContent;

  const fileLabel =
    fileType === "text"
      ? "extracted text from a PDF bank statement"
      : `${fileType.toUpperCase()} bank statement`;

  const systemPrompt = `You are an expert financial data extraction system. Parse bank statements and extract transactions with high accuracy.

RULES:
1. SIGN CONVENTION (CRITICAL):
   - Debits/Expenses/Purchases = NEGATIVE amounts (money going OUT)
   - Credits/Income/Deposits = POSITIVE amounts (money coming IN)
   - If a column is labeled "Débito"/"Debit"/"Saída" → NEGATIVE
   - If a column is labeled "Crédito"/"Credit"/"Entrada" → POSITIVE

2. DATE FORMAT: Always YYYY-MM-DD. Convert DD/MM/YYYY → YYYY-MM-DD.

3. DESCRIPTIONS: Combine multi-line into single line. Keep merchant names readable.

4. CATEGORIES: Assign each transaction to the best match from this list: ${categoryNames.join(", ")}. If none fit, use "Other".

5. IGNORE: Running balances, account numbers, headers, footers.`;

  const userPrompt = `Parse this ${fileLabel} and extract all transactions.

Content:
${truncatedContent}

Debits are NEGATIVE, Credits are POSITIVE.`;

  const transactions = await withRetry(async () => {
    const response = await openai.chat.completions.create({
      model: OPENAI_MODEL,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.1,
      response_format: {
        type: "json_schema",
        json_schema: TRANSACTION_SCHEMA,
      },
    });

    const content = response.choices[0].message.content;
    if (!content) throw new Error("No response from OpenAI");

    const parsed = JSON.parse(content);
    if (!Array.isArray(parsed.transactions)) {
      throw new Error("Invalid response format: transactions is not an array");
    }
    return parsed.transactions;
  });

  return { transactions, wasTruncated };
}

/**
 * Parse statement with Vision (image-based files)
 */
async function parseStatementWithVision(
  images: ImageData[],
  categoryNames: string[],
): Promise<ParsedTransaction[]> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error(
      "OpenAI API key not configured. Please set OPENAI_API_KEY in your Convex environment.",
    );
  }

  const openai = new OpenAI({ apiKey });

  const systemPrompt = `You are an expert at reading bank statements from images. Extract every visible transaction with high accuracy.

RULES:
1. SIGN CONVENTION:
   - Money OUT (Débito/Debit/Saída column) = NEGATIVE amount
   - Money IN (Crédito/Credit/Entrada column) = POSITIVE amount
   - Look at which column the amount appears in to determine sign

2. DATE FORMAT: Always YYYY-MM-DD.

3. READ CAREFULLY: Examine each row. Look for debit/credit columns. Combine multi-line descriptions.

4. CATEGORIES: Assign each transaction to the best match from: ${categoryNames.join(", ")}. If none fit, use "Other".

5. IGNORE: Balance columns, account numbers, headers.`;

  const userPrompt = `Extract ALL transactions from this bank statement. Debit amounts are NEGATIVE, credit amounts are POSITIVE. Extract EVERY visible transaction.`;

  const content: OpenAI.Chat.ChatCompletionContentPart[] = [
    { type: "text", text: userPrompt },
  ];

  for (const image of images) {
    content.push({
      type: "image_url",
      image_url: {
        url: `data:${image.mimeType};base64,${image.base64}`,
        detail: "high",
      },
    });
  }

  return withRetry(async () => {
    const response = await openai.chat.completions.create({
      model: OPENAI_MODEL,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content },
      ],
      temperature: 0.1,
      max_tokens: 16384,
      response_format: {
        type: "json_schema",
        json_schema: TRANSACTION_SCHEMA,
      },
    });

    const responseContent = response.choices[0].message.content;
    if (!responseContent) throw new Error("No response from OpenAI");

    const parsed = JSON.parse(responseContent);
    if (!Array.isArray(parsed.transactions)) {
      throw new Error("Invalid response format: transactions is not an array");
    }
    return parsed.transactions;
  });
}
