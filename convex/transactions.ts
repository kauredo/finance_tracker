import { query, mutation, internalMutation } from "./_generated/server";
import { v } from "convex/values";
import {
  requireUser,
  canAccessAccount,
  requireAccountAccess,
  getAccessibleAccountIds,
} from "./lib/access";

/**
 * List transactions with filtering and pagination
 */
export const list = query({
  args: {
    accountId: v.optional(v.id("accounts")),
    categoryId: v.optional(v.id("categories")),
    dateFrom: v.optional(v.string()),
    dateTo: v.optional(v.string()),
    search: v.optional(v.string()),
    minAmount: v.optional(v.number()),
    maxAmount: v.optional(v.number()),
    limit: v.optional(v.number()),
    offset: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);

    // Get all accessible account IDs
    const accessibleAccountIds = await getAccessibleAccountIds(ctx, user._id);

    // If specific account requested, verify access
    if (args.accountId) {
      if (!accessibleAccountIds.has(args.accountId)) {
        throw new Error("Access denied to this account");
      }
    }

    // Get transactions ordered by date descending
    let transactions = await ctx.db
      .query("transactions")
      .withIndex("by_date")
      .order("desc")
      .collect();

    // Filter by accessible accounts
    transactions = transactions.filter((t) =>
      accessibleAccountIds.has(t.accountId),
    );

    // Apply filters
    if (args.accountId) {
      transactions = transactions.filter((t) => t.accountId === args.accountId);
    }
    if (args.categoryId) {
      transactions = transactions.filter(
        (t) => t.categoryId === args.categoryId,
      );
    }
    if (args.dateFrom) {
      transactions = transactions.filter((t) => t.date >= args.dateFrom!);
    }
    if (args.dateTo) {
      transactions = transactions.filter((t) => t.date <= args.dateTo!);
    }
    if (args.search) {
      const searchLower = args.search.toLowerCase();
      transactions = transactions.filter((t) =>
        t.description.toLowerCase().includes(searchLower),
      );
    }
    if (args.minAmount !== undefined) {
      transactions = transactions.filter(
        (t) => Math.abs(t.amount) >= args.minAmount!,
      );
    }
    if (args.maxAmount !== undefined) {
      transactions = transactions.filter(
        (t) => Math.abs(t.amount) <= args.maxAmount!,
      );
    }

    const total = transactions.length;

    // Apply pagination
    const offset = args.offset ?? 0;
    const limit = args.limit ?? 50;
    transactions = transactions.slice(offset, offset + limit);

    // Enrich with category and account data
    const enriched = await Promise.all(
      transactions.map(async (t) => {
        const category = t.categoryId ? await ctx.db.get(t.categoryId) : null;
        const account = await ctx.db.get(t.accountId);
        return {
          ...t,
          category,
          account,
        };
      }),
    );

    return { transactions: enriched, total, limit, offset };
  },
});

/**
 * Get a single transaction by ID
 */
export const getById = query({
  args: { id: v.id("transactions") },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    const transaction = await ctx.db.get(args.id);

    if (!transaction) {
      throw new Error("Transaction not found");
    }

    const hasAccess = await canAccessAccount(
      ctx,
      user._id,
      transaction.accountId,
    );
    if (!hasAccess) {
      throw new Error("Access denied");
    }

    // Enrich with category and account data
    const category = transaction.categoryId
      ? await ctx.db.get(transaction.categoryId)
      : null;
    const account = await ctx.db.get(transaction.accountId);

    return {
      ...transaction,
      category,
      account,
    };
  },
});

/**
 * Create a new transaction
 */
export const create = mutation({
  args: {
    accountId: v.id("accounts"),
    categoryId: v.optional(v.id("categories")),
    date: v.string(),
    description: v.string(),
    amount: v.number(),
    notes: v.optional(v.string()),
    isRecurring: v.optional(v.boolean()),
    isTransfer: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    await requireAccountAccess(ctx, user._id, args.accountId);

    const transactionId = await ctx.db.insert("transactions", {
      accountId: args.accountId,
      categoryId: args.categoryId,
      userId: user._id,
      date: args.date,
      description: args.description,
      amount: args.amount,
      notes: args.notes,
      isRecurring: args.isRecurring ?? false,
      isTransfer: args.isTransfer ?? false,
      createdAt: Date.now(),
    });

    // Update account balance (only if transaction is at or after anchor date)
    const account = await ctx.db.get(args.accountId);
    if (account) {
      const anchorDate = account.startingBalanceDate;
      if (!anchorDate || args.date >= anchorDate) {
        await ctx.db.patch(args.accountId, {
          balance: (account.balance ?? 0) + args.amount,
          updatedAt: Date.now(),
        });
      }
    }

    return transactionId;
  },
});

/**
 * Update a transaction
 */
export const update = mutation({
  args: {
    id: v.id("transactions"),
    date: v.optional(v.string()),
    description: v.optional(v.string()),
    amount: v.optional(v.number()),
    categoryId: v.optional(v.id("categories")),
    accountId: v.optional(v.id("accounts")),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    const transaction = await ctx.db.get(args.id);

    if (!transaction) {
      throw new Error("Transaction not found");
    }

    await requireAccountAccess(ctx, user._id, transaction.accountId);

    // If changing account, verify access to new account
    if (args.accountId && args.accountId !== transaction.accountId) {
      await requireAccountAccess(ctx, user._id, args.accountId);
    }

    const oldAmount = transaction.amount;
    const newAmount = args.amount ?? oldAmount;
    const oldAccountId = transaction.accountId;
    const newAccountId = args.accountId ?? oldAccountId;

    // Build update object
    const updates: Record<string, unknown> = {};
    if (args.date !== undefined) updates.date = args.date;
    if (args.description !== undefined) updates.description = args.description;
    if (args.amount !== undefined) updates.amount = args.amount;
    if (args.categoryId !== undefined) updates.categoryId = args.categoryId;
    if (args.accountId !== undefined) updates.accountId = args.accountId;
    if (args.notes !== undefined) updates.notes = args.notes;

    await ctx.db.patch(args.id, updates);

    // Update account balances if amount, date, or account changed
    const oldDate = transaction.date;
    const newDate = args.date ?? oldDate;

    if (
      args.amount !== undefined ||
      args.accountId !== undefined ||
      args.date !== undefined
    ) {
      // Remove old amount from old account (if it was counted)
      const oldAccount = await ctx.db.get(oldAccountId);
      if (oldAccount) {
        const oldAnchor = oldAccount.startingBalanceDate;
        const oldCounted = !oldAnchor || oldDate >= oldAnchor;
        if (oldCounted) {
          await ctx.db.patch(oldAccountId, {
            balance: (oldAccount.balance ?? 0) - oldAmount,
            updatedAt: Date.now(),
          });
        }
      }

      // Add new amount to new account (if it should be counted)
      const newAccount =
        newAccountId === oldAccountId
          ? await ctx.db.get(newAccountId) // re-read after patch
          : await ctx.db.get(newAccountId);
      if (newAccount) {
        const newAnchor = newAccount.startingBalanceDate;
        const newCounted = !newAnchor || newDate >= newAnchor;
        if (newCounted) {
          await ctx.db.patch(newAccountId, {
            balance: (newAccount.balance ?? 0) + newAmount,
            updatedAt: Date.now(),
          });
        }
      }
    }

    return ctx.db.get(args.id);
  },
});

/**
 * Delete a transaction
 */
export const remove = mutation({
  args: { id: v.id("transactions") },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    const transaction = await ctx.db.get(args.id);

    if (!transaction) {
      throw new Error("Transaction not found");
    }

    await requireAccountAccess(ctx, user._id, transaction.accountId);

    // Update account balance (only if transaction was counted)
    const account = await ctx.db.get(transaction.accountId);
    if (account) {
      const anchorDate = account.startingBalanceDate;
      if (!anchorDate || transaction.date >= anchorDate) {
        await ctx.db.patch(transaction.accountId, {
          balance: (account.balance ?? 0) - transaction.amount,
          updatedAt: Date.now(),
        });
      }
    }

    await ctx.db.delete(args.id);
    return { success: true };
  },
});

/**
 * Bulk create transactions (for statement import)
 */
export const bulkCreate = mutation({
  args: {
    accountId: v.id("accounts"),
    transactions: v.array(
      v.object({
        date: v.string(),
        description: v.string(),
        amount: v.number(),
        categoryId: v.optional(v.id("categories")),
        notes: v.optional(v.string()),
        isTransfer: v.optional(v.boolean()),
      }),
    ),
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    await requireAccountAccess(ctx, user._id, args.accountId);

    const now = Date.now();
    const account = await ctx.db.get(args.accountId);
    const anchorDate = account?.startingBalanceDate;
    let totalAmount = 0;

    const ids = await Promise.all(
      args.transactions.map(async (t) => {
        if (!anchorDate || t.date >= anchorDate) {
          totalAmount += t.amount;
        }
        return ctx.db.insert("transactions", {
          accountId: args.accountId,
          categoryId: t.categoryId,
          userId: user._id,
          date: t.date,
          description: t.description,
          amount: t.amount,
          notes: t.notes,
          isRecurring: false,
          isTransfer: t.isTransfer ?? false,
          createdAt: now,
        });
      }),
    );

    // Update account balance (re-read in case of concurrent changes)
    const currentAccount = await ctx.db.get(args.accountId);
    if (currentAccount && totalAmount !== 0) {
      await ctx.db.patch(args.accountId, {
        balance: (currentAccount.balance ?? 0) + totalAmount,
        updatedAt: now,
      });
    }

    return { count: ids.length, ids };
  },
});

/**
 * Get transaction stats for reports
 */
export const getStats = query({
  args: {
    accountId: v.optional(v.id("accounts")),
    dateFrom: v.optional(v.string()),
    dateTo: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    const accessibleAccountIds = await getAccessibleAccountIds(ctx, user._id);

    let transactions = await ctx.db
      .query("transactions")
      .withIndex("by_date")
      .collect();

    // Filter by accessible accounts
    transactions = transactions.filter((t) =>
      accessibleAccountIds.has(t.accountId),
    );

    // Apply filters
    if (args.accountId) {
      if (!accessibleAccountIds.has(args.accountId)) {
        throw new Error("Access denied");
      }
      transactions = transactions.filter((t) => t.accountId === args.accountId);
    }
    if (args.dateFrom) {
      transactions = transactions.filter((t) => t.date >= args.dateFrom!);
    }
    if (args.dateTo) {
      transactions = transactions.filter((t) => t.date <= args.dateTo!);
    }

    // Exclude transfers from income/expense stats
    transactions = transactions.filter((t) => !t.isTransfer);

    // Calculate stats
    const income = transactions
      .filter((t) => t.amount > 0)
      .reduce((sum, t) => sum + t.amount, 0);
    const expenses = transactions
      .filter((t) => t.amount < 0)
      .reduce((sum, t) => sum + Math.abs(t.amount), 0);
    const net = income - expenses;

    // Group by category
    const byCategory: Record<string, number> = {};
    for (const t of transactions) {
      if (t.categoryId) {
        const key = t.categoryId;
        byCategory[key] = (byCategory[key] ?? 0) + t.amount;
      }
    }

    // Enrich category data
    const categoryStats = await Promise.all(
      Object.entries(byCategory).map(async ([categoryId, amount]) => {
        const category = await ctx.db.get(categoryId as any);
        return {
          category,
          amount,
        };
      }),
    );

    return {
      income,
      expenses,
      net,
      transactionCount: transactions.length,
      categoryStats,
    };
  },
});

/**
 * Auto-detect transfers by matching newly imported transactions against
 * existing transactions in other accounts.
 * Matching: exact opposite amount, date within 2 days, unique match only.
 */
export const detectTransfers = internalMutation({
  args: {
    accountId: v.id("accounts"),
    transactionIds: v.array(v.id("transactions")),
  },
  handler: async (ctx, args) => {
    if (args.transactionIds.length === 0) return;

    // Load the newly imported transactions
    const newTxs = (
      await Promise.all(args.transactionIds.map((id) => ctx.db.get(id)))
    ).filter((t) => t !== null);

    if (newTxs.length === 0) return;

    // Find the date range of the batch (± 2 days buffer)
    const dates = newTxs.map((t) => t.date).sort();
    const minDate = shiftDate(dates[0], -2);
    const maxDate = shiftDate(dates[dates.length - 1], 2);

    // Get the importing user to find accessible accounts
    const userId = newTxs[0].userId;
    const accessibleAccountIds = await getAccessibleAccountIds(ctx, userId);

    // Collect transactions from OTHER accessible accounts in the date window
    const otherAccountTxs = await ctx.db
      .query("transactions")
      .withIndex("by_date")
      .filter((q) =>
        q.and(
          q.gte(q.field("date"), minDate),
          q.lte(q.field("date"), maxDate),
          q.neq(q.field("accountId"), args.accountId),
        ),
      )
      .collect();

    // Filter to only accessible accounts
    const candidates = otherAccountTxs.filter(
      (t) => accessibleAccountIds.has(t.accountId) && !t.isTransfer,
    );

    // For each new transaction, look for a unique match
    for (const newTx of newTxs) {
      if (newTx.isTransfer) continue; // Already marked

      const matches = candidates.filter(
        (c) =>
          c.amount === -newTx.amount &&
          Math.abs(daysBetween(c.date, newTx.date)) <= 2,
      );

      // Only mark if exactly one match (unambiguous)
      if (matches.length === 1) {
        await ctx.db.patch(newTx._id, { isTransfer: true });
        await ctx.db.patch(matches[0]._id, { isTransfer: true });
        // Remove matched candidate so it can't match again
        const idx = candidates.indexOf(matches[0]);
        if (idx !== -1) candidates.splice(idx, 1);
      }
    }
  },
});

/** Shift an ISO date string by N days */
function shiftDate(isoDate: string, days: number): string {
  const d = new Date(isoDate);
  d.setDate(d.getDate() + days);
  return d.toISOString().split("T")[0];
}

/** Number of days between two ISO date strings */
function daysBetween(a: string, b: string): number {
  const msPerDay = 86400000;
  return Math.round(
    (new Date(a).getTime() - new Date(b).getTime()) / msPerDay,
  );
}
