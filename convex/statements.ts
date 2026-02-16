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

// Valid categories that the AI can assign
const VALID_CATEGORIES = [
  "groceries",
  "dining",
  "transport",
  "utilities",
  "entertainment",
  "shopping",
  "healthcare",
  "income",
  "subscriptions",
  "travel",
  "education",
  "personal",
  "other",
] as const;

type ValidCategory = (typeof VALID_CATEGORIES)[number];

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
 * Process an uploaded statement file with AI
 */
export const processStatement = action({
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
    success: boolean;
    transactionCount: number;
    statementId: string;
    skippedDuplicates?: number;
  }> => {
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
      const arrayBuffer = await response.arrayBuffer();
      const text = decodeTextWithFallback(arrayBuffer);
      transactions = await parseStatementWithAI(text, fileExt as "csv" | "tsv");
    } else if (["png", "jpg", "jpeg"].includes(fileExt)) {
      const arrayBuffer = await response.arrayBuffer();
      const base64 = Buffer.from(arrayBuffer).toString("base64");
      const mimeType = fileExt === "png" ? "image/png" : "image/jpeg";
      transactions = await parseStatementWithVision([{ base64, mimeType }]);
    } else if (fileExt === "pdf") {
      const arrayBuffer = await response.arrayBuffer();
      const pdfText = await extractTextFromPDF(arrayBuffer);
      if (pdfText && pdfText.trim().length > 100) {
        transactions = await parseStatementWithAI(pdfText, "csv");
      } else {
        // Fallback: try vision mode for PDFs with non-extractable text
        const base64 = Buffer.from(arrayBuffer).toString("base64");
        transactions = await parseStatementWithVision([
          { base64, mimeType: "application/pdf" },
        ]);
      }
    } else {
      throw new Error(`Unsupported file type: ${fileExt}`);
    }

    // Validate and clean transactions
    const validatedTransactions = validateTransactions(transactions);

    if (validatedTransactions.length === 0) {
      throw new Error(
        "No valid transactions found in the statement. Please check the file format.",
      );
    }

    // Get categories to map names to IDs
    const categories = await ctx.runQuery(api.categories.list);
    const categoryMap = new Map<string, Id<"categories">>(
      categories.map((c: { name: string; _id: Id<"categories"> }) => [
        c.name.toLowerCase(),
        c._id,
      ]),
    );

    // Find "other" category as fallback
    const otherCategoryId = categoryMap.get("other");

    // Check for existing transactions to avoid duplicates
    const existingTransactions = await ctx.runQuery(api.transactions.list, {
      accountId: args.accountId,
      limit: 1000,
      offset: 0,
    });

    const existingSet = new Set(
      (existingTransactions?.transactions || []).map(
        (t: { date: string; amount: number; description: string }) =>
          `${t.date}|${t.amount}|${t.description.toLowerCase().slice(0, 30)}`,
      ),
    );

    // Filter out duplicates and map categories
    let skippedDuplicates = 0;
    const transactionsWithCategories = validatedTransactions
      .filter((t) => {
        const key = `${t.date}|${t.amount}|${t.description.toLowerCase().slice(0, 30)}`;
        if (existingSet.has(key)) {
          skippedDuplicates++;
          return false;
        }
        return true;
      })
      .map((t) => {
        const categoryId =
          categoryMap.get(t.category.toLowerCase()) || otherCategoryId;
        return {
          date: t.date,
          description: t.description,
          amount: t.amount,
          categoryId: categoryId as Id<"categories"> | undefined,
          notes: `Imported from ${args.fileName}`,
        };
      });

    if (transactionsWithCategories.length === 0) {
      throw new Error(
        `All ${validatedTransactions.length} transactions were already imported. No new transactions to add.`,
      );
    }

    // Create the statement record
    const statementId = await ctx.runMutation(
      internal.statements.createStatementRecord,
      {
        accountId: args.accountId,
        fileName: args.fileName,
        storageId: args.storageId,
        fileType: args.fileType,
        transactionCount: transactionsWithCategories.length,
        userId,
      },
    );

    // Bulk create the transactions
    await ctx.runMutation(api.transactions.bulkCreate, {
      accountId: args.accountId,
      transactions: transactionsWithCategories,
    });

    return {
      success: true,
      transactionCount: transactionsWithCategories.length,
      statementId,
      skippedDuplicates: skippedDuplicates > 0 ? skippedDuplicates : undefined,
    };
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
  }> => {
    const userId = await ctx.runQuery(api.statements.getCurrentUserId);
    if (!userId) throw new Error("Unauthorized");

    const fileUrl = await ctx.storage.getUrl(args.storageId);
    if (!fileUrl) throw new Error("File not found in storage");

    const response = await fetch(fileUrl);
    if (!response.ok) throw new Error("Failed to fetch file from storage");

    const fileExt = args.fileName.split(".").pop()?.toLowerCase() || "";
    let transactions: ParsedTransaction[] = [];

    if (["csv", "tsv"].includes(fileExt)) {
      const arrayBuffer = await response.arrayBuffer();
      const text = decodeTextWithFallback(arrayBuffer);
      transactions = await parseStatementWithAI(text, fileExt as "csv" | "tsv");
    } else if (["png", "jpg", "jpeg"].includes(fileExt)) {
      const arrayBuffer = await response.arrayBuffer();
      const base64 = Buffer.from(arrayBuffer).toString("base64");
      const mimeType = fileExt === "png" ? "image/png" : "image/jpeg";
      transactions = await parseStatementWithVision([{ base64, mimeType }]);
    } else if (fileExt === "pdf") {
      const arrayBuffer = await response.arrayBuffer();
      const pdfText = await extractTextFromPDF(arrayBuffer);
      if (pdfText && pdfText.trim().length > 100) {
        transactions = await parseStatementWithAI(pdfText, "csv");
      } else {
        // Fallback: try vision mode for PDFs with non-extractable text
        const base64 = Buffer.from(arrayBuffer).toString("base64");
        transactions = await parseStatementWithVision([
          { base64, mimeType: "application/pdf" },
        ]);
      }
    } else {
      throw new Error(`Unsupported file type: ${fileExt}`);
    }

    const validatedTransactions = validateTransactions(transactions);
    if (validatedTransactions.length === 0) {
      throw new Error(
        "No valid transactions found in the statement. Please check the file format.",
      );
    }

    // Get categories to map names to IDs
    const categories = await ctx.runQuery(api.categories.list);
    const categoryMap = new Map<string, { id: Id<"categories">; name: string }>(
      categories.map((c: { name: string; _id: Id<"categories"> }) => [
        c.name.toLowerCase(),
        { id: c._id, name: c.name },
      ]),
    );
    const otherCategory = categoryMap.get("other");

    // Check for duplicates
    const existingTransactions = await ctx.runQuery(api.transactions.list, {
      accountId: args.accountId,
      limit: 1000,
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

    return { preview, availableCategories, storageId: args.storageId };
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

/**
 * Extract text from PDF using basic text extraction
 */
async function extractTextFromPDF(arrayBuffer: ArrayBuffer): Promise<string> {
  const uint8Array = new Uint8Array(arrayBuffer);
  let text = "";

  const pdfString = new TextDecoder("latin1").decode(uint8Array);

  // Look for stream content
  const streamMatches = pdfString.match(
    /stream[\r\n]+([\s\S]*?)[\r\n]+endstream/g,
  );
  if (streamMatches) {
    for (const match of streamMatches) {
      const textMatches = match.match(/\(([^)]+)\)/g);
      if (textMatches) {
        for (const textMatch of textMatches) {
          const extracted = textMatch.slice(1, -1);
          const cleanText = extracted.replace(/[^\x20-\x7E\xA0-\xFF]/g, " ");
          if (cleanText.trim()) {
            text += cleanText + " ";
          }
        }
      }
    }
  }

  // Also try to find plain text content
  const plainTextMatches = pdfString.match(/\/T[cj]\s*\[([^\]]+)\]/g);
  if (plainTextMatches) {
    for (const match of plainTextMatches) {
      const textParts = match.match(/\(([^)]+)\)/g);
      if (textParts) {
        for (const part of textParts) {
          text += part.slice(1, -1) + " ";
        }
      }
    }
  }

  return text.trim();
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

      // Validate category
      const category = validateCategory(t.category);

      return {
        date,
        description,
        amount,
        category: category as string,
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

/**
 * Validate category against allowed list
 */
function validateCategory(category: string): ValidCategory {
  if (!category) return "other";

  const normalized = category.toLowerCase().trim();

  if (VALID_CATEGORIES.includes(normalized as ValidCategory)) {
    return normalized as ValidCategory;
  }

  // Map common variations
  const categoryMappings: Record<string, ValidCategory> = {
    food: "groceries",
    supermarket: "groceries",
    restaurant: "dining",
    cafe: "dining",
    coffee: "dining",
    taxi: "transport",
    uber: "transport",
    lyft: "transport",
    gas: "transport",
    fuel: "transport",
    electric: "utilities",
    water: "utilities",
    internet: "utilities",
    phone: "utilities",
    mobile: "utilities",
    movies: "entertainment",
    games: "entertainment",
    music: "entertainment",
    streaming: "subscriptions",
    netflix: "subscriptions",
    spotify: "subscriptions",
    amazon: "shopping",
    clothes: "shopping",
    clothing: "shopping",
    doctor: "healthcare",
    pharmacy: "healthcare",
    medical: "healthcare",
    hospital: "healthcare",
    salary: "income",
    wages: "income",
    transfer: "other",
    atm: "other",
    withdrawal: "other",
    hotel: "travel",
    flight: "travel",
    airline: "travel",
    school: "education",
    university: "education",
    course: "education",
    gym: "personal",
    beauty: "personal",
    haircut: "personal",
  };

  return categoryMappings[normalized] || "other";
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
  fileType: "csv" | "tsv",
): Promise<ParsedTransaction[]> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error(
      "OpenAI API key not configured. Please set OPENAI_API_KEY in your Convex environment.",
    );
  }

  const openai = new OpenAI({ apiKey });

  // Truncate very long content to avoid token limits
  const maxLength = 50000;
  const truncatedContent =
    fileContent.length > maxLength
      ? fileContent.slice(0, maxLength) + "\n... (truncated)"
      : fileContent;

  const systemPrompt = `You are an expert financial data extraction system. Your job is to parse bank statements and extract transaction data with high accuracy.

CORE RULES:
1. SIGN CONVENTION (CRITICAL):
   - Debits/Expenses/Purchases = NEGATIVE amounts (money going OUT)
   - Credits/Income/Deposits = POSITIVE amounts (money coming IN)
   - If a column is labeled "Débito"/"Debit"/"Saída" → use NEGATIVE
   - If a column is labeled "Crédito"/"Credit"/"Entrada" → use POSITIVE

2. DATE FORMAT:
   - Always output dates as YYYY-MM-DD (ISO 8601)
   - European dates (DD/MM/YYYY): 15/01/2024 → 2024-01-15
   - Handle various separators: /, -, .

3. DESCRIPTION CLEANING:
   - Combine multi-line descriptions into single line
   - Remove excessive whitespace
   - Keep merchant/payee names clear and readable

4. CATEGORY ASSIGNMENT:
   Use ONLY these categories: ${VALID_CATEGORIES.join(", ")}

5. IGNORE:
   - Running balances (Saldo)
   - Account numbers
   - Headers and footers

EXAMPLES:
- "SUPERMERCADO CONTINENTE" → groceries, negative amount
- "TRANSFERENCIA RECEBIDA" → income, positive amount
- "PAGAMENTO SERVICO LUZ" → utilities, negative amount
- "UBER *TRIP" → transport, negative amount`;

  const userPrompt = `Parse this ${fileType.toUpperCase()} bank statement and extract all transactions.

Content:
${truncatedContent}

Return JSON with this exact structure:
{
  "transactions": [
    {
      "date": "YYYY-MM-DD",
      "description": "Merchant or description",
      "amount": -99.99,
      "category": "category_name"
    }
  ]
}

Remember: Debits are NEGATIVE, Credits are POSITIVE.`;

  return withRetry(async () => {
    const response = await openai.chat.completions.create({
      model: OPENAI_MODEL,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.1,
      response_format: { type: "json_object" },
    });

    const content = response.choices[0].message.content;
    if (!content) throw new Error("No response from OpenAI");

    const parsed = JSON.parse(content);
    const transactions = parsed.transactions || [];

    if (!Array.isArray(transactions)) {
      throw new Error("Invalid response format: transactions is not an array");
    }

    return transactions;
  });
}

/**
 * Parse statement with Vision (image-based files)
 */
async function parseStatementWithVision(
  images: ImageData[],
): Promise<ParsedTransaction[]> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error(
      "OpenAI API key not configured. Please set OPENAI_API_KEY in your Convex environment.",
    );
  }

  const openai = new OpenAI({ apiKey });

  const systemPrompt = `You are an expert at reading bank statements from images. Extract every visible transaction with high accuracy.

CRITICAL RULES:
1. SIGN CONVENTION:
   - Money OUT (Débito/Debit/Saída column) = NEGATIVE amount
   - Money IN (Crédito/Credit/Entrada column) = POSITIVE amount
   - Look at which column the amount appears in to determine sign

2. DATE FORMAT: Always output as YYYY-MM-DD

3. READ CAREFULLY:
   - Examine each row of the statement
   - Look for amount columns (usually 2: debit and credit)
   - Combine multi-line descriptions

4. CATEGORIES: ${VALID_CATEGORIES.join(", ")}

5. IGNORE: Balance columns (Saldo), account numbers, headers`;

  const userPrompt = `Extract ALL transactions from this bank statement image.

Return JSON:
{
  "transactions": [
    {"date": "YYYY-MM-DD", "description": "...", "amount": -99.99, "category": "..."}
  ]
}

IMPORTANT:
- Debit column amounts should be NEGATIVE
- Credit column amounts should be POSITIVE
- Extract EVERY visible transaction`;

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
      max_tokens: 4096,
      response_format: { type: "json_object" },
    });

    const responseContent = response.choices[0].message.content;
    if (!responseContent) {
      throw new Error("No response from OpenAI");
    }

    // Clean up markdown if present
    let cleanContent = responseContent.trim();
    if (cleanContent.startsWith("```json")) {
      cleanContent = cleanContent
        .replace(/^```json\n/, "")
        .replace(/\n```$/, "");
    } else if (cleanContent.startsWith("```")) {
      cleanContent = cleanContent.replace(/^```\n/, "").replace(/\n```$/, "");
    }

    const parsed = JSON.parse(cleanContent);
    const transactions = parsed.transactions || [];

    if (!Array.isArray(transactions)) {
      throw new Error("Invalid response format: transactions is not an array");
    }

    return transactions;
  });
}
