import { query, mutation, internalMutation } from "./_generated/server";
import { v } from "convex/values";
import { Id } from "./_generated/dataModel";
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

    // Batch-fetch categories and accounts to avoid N+1
    const uniqueCatIds = [
      ...new Set(transactions.map((t) => t.categoryId).filter(Boolean)),
    ] as Id<"categories">[];
    const uniqueAccIds = [...new Set(transactions.map((t) => t.accountId))];
    const [cats, accs] = await Promise.all([
      Promise.all(uniqueCatIds.map((id) => ctx.db.get(id))),
      Promise.all(uniqueAccIds.map((id) => ctx.db.get(id))),
    ]);
    const catMap = new Map(cats.filter(Boolean).map((c) => [c!._id, c]));
    const accMap = new Map(accs.filter(Boolean).map((a) => [a!._id, a]));

    const enriched = transactions.map((t) => ({
      ...t,
      category: t.categoryId ? (catMap.get(t.categoryId) ?? null) : null,
      account: accMap.get(t.accountId) ?? null,
    }));

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
 * Get reimbursements linked to a split parent transaction
 */
export const getReimbursements = query({
  args: { parentId: v.id("transactions") },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    const parent = await ctx.db.get(args.parentId);

    if (!parent) {
      throw new Error("Transaction not found");
    }

    const hasAccess = await canAccessAccount(ctx, user._id, parent.accountId);
    if (!hasAccess) {
      throw new Error("Access denied");
    }

    const reimbursements = await ctx.db
      .query("transactions")
      .withIndex("by_split_parent", (q) => q.eq("splitParentId", args.parentId))
      .collect();

    // Enrich with account data
    const uniqueAccIds = [...new Set(reimbursements.map((r) => r.accountId))];
    const accDocs = await Promise.all(uniqueAccIds.map((id) => ctx.db.get(id)));
    const accMap = new Map(accDocs.filter(Boolean).map((a) => [a!._id, a]));

    return reimbursements.map((r) => ({
      ...r,
      account: accMap.get(r.accountId) ?? null,
    }));
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
    isSplit: v.optional(v.boolean()),
    splitParticipants: v.optional(v.number()),
    splitParentId: v.optional(v.id("transactions")),
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    await requireAccountAccess(ctx, user._id, args.accountId);

    // Validate split fields
    if (args.isSplit) {
      if (args.isTransfer) {
        throw new Error("A transaction cannot be both a split and a transfer");
      }
      if (args.amount >= 0) {
        throw new Error("Split expenses must be negative amounts");
      }
      if (!args.splitParticipants || args.splitParticipants < 2) {
        throw new Error("Split expenses need at least 2 participants");
      }
    }
    if (args.splitParentId) {
      const parent = await ctx.db.get(args.splitParentId);
      if (!parent || !parent.isSplit) {
        throw new Error("Invalid split parent transaction");
      }
      if (args.amount <= 0) {
        throw new Error("Reimbursements must be positive amounts");
      }
    }

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
      isSplit: args.isSplit,
      splitParticipants: args.splitParticipants,
      splitParentId: args.splitParentId,
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
    isSplit: v.optional(v.boolean()),
    splitParticipants: v.optional(v.number()),
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

    // Validate split fields
    if (args.isSplit !== undefined) {
      if (args.isSplit && transaction.isTransfer) {
        throw new Error("A transaction cannot be both a split and a transfer");
      }
      if (args.isSplit) {
        const amount = args.amount ?? transaction.amount;
        if (amount >= 0) {
          throw new Error("Split expenses must be negative amounts");
        }
        const participants = args.splitParticipants ?? transaction.splitParticipants;
        if (!participants || participants < 2) {
          throw new Error("Split expenses need at least 2 participants");
        }
      }
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
    if (args.isSplit !== undefined) updates.isSplit = args.isSplit;
    if (args.splitParticipants !== undefined) updates.splitParticipants = args.splitParticipants;

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

    // If deleting a split parent, orphan children
    if (transaction.isSplit) {
      const children = await ctx.db
        .query("transactions")
        .withIndex("by_split_parent", (q) => q.eq("splitParentId", args.id))
        .collect();
      await Promise.all(
        children.map((child) =>
          ctx.db.patch(child._id, { splitParentId: undefined }),
        ),
      );
    }

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

    // Build reimbursement totals map for split-aware calculation
    const reimbursementTotals = new Map<string, number>();
    for (const t of transactions) {
      if (t.splitParentId) {
        const key = t.splitParentId as string;
        reimbursementTotals.set(key, (reimbursementTotals.get(key) ?? 0) + t.amount);
      }
    }

    // Calculate stats (skip children, use net amounts for split parents)
    let income = 0;
    let expenses = 0;
    for (const t of transactions) {
      if (t.splitParentId) continue; // skip reimbursement children
      if (t.isSplit) {
        // Net amount = gross expense + reimbursements received
        const reimbursed = reimbursementTotals.get(t._id as string) ?? 0;
        const netAmount = t.amount + reimbursed; // e.g. -120 + 100 = -20
        if (netAmount < 0) expenses += Math.abs(netAmount);
        else income += netAmount;
      } else if (t.amount > 0) {
        income += t.amount;
      } else {
        expenses += Math.abs(t.amount);
      }
    }
    const net = income - expenses;

    // Group by category (split-aware)
    const byCategory: Record<string, number> = {};
    for (const t of transactions) {
      if (t.splitParentId) continue; // skip children
      if (t.categoryId) {
        const key = t.categoryId;
        if (t.isSplit) {
          const reimbursed = reimbursementTotals.get(t._id as string) ?? 0;
          byCategory[key] = (byCategory[key] ?? 0) + (t.amount + reimbursed);
        } else {
          byCategory[key] = (byCategory[key] ?? 0) + t.amount;
        }
      }
    }

    // Batch-fetch category data
    const catIds = Object.keys(byCategory) as Id<"categories">[];
    const catDocs = await Promise.all(catIds.map((id) => ctx.db.get(id)));
    const catLookup = new Map(
      catDocs.filter(Boolean).map((c) => [c!._id as string, c]),
    );
    const categoryStats = Object.entries(byCategory).map(
      ([categoryId, amount]) => ({
        category: catLookup.get(categoryId) ?? null,
        amount,
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

/**
 * Bulk delete transactions
 */
export const bulkDelete = mutation({
  args: {
    ids: v.array(v.id("transactions")),
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    const accessibleAccountIds = await getAccessibleAccountIds(ctx, user._id);

    // Load all transactions and verify access
    const transactions = (
      await Promise.all(args.ids.map((id) => ctx.db.get(id)))
    ).filter((t) => t !== null);

    for (const t of transactions) {
      if (!accessibleAccountIds.has(t.accountId)) {
        throw new Error("Access denied to one or more transactions");
      }
    }

    // Batch-fetch accounts for balance adjustments
    const uniqueAccountIds = [...new Set(transactions.map((t) => t.accountId))];
    const accountDocs = await Promise.all(
      uniqueAccountIds.map((id) => ctx.db.get(id)),
    );
    const accountMap = new Map(
      accountDocs.filter(Boolean).map((a) => [a!._id, a]),
    );

    const balanceDeltas = new Map<
      (typeof transactions)[0]["accountId"],
      number
    >();
    for (const t of transactions) {
      const account = accountMap.get(t.accountId);
      const anchorDate = account?.startingBalanceDate;
      if (!anchorDate || t.date >= anchorDate) {
        balanceDeltas.set(
          t.accountId,
          (balanceDeltas.get(t.accountId) ?? 0) - t.amount,
        );
      }
    }

    // Delete all transactions
    await Promise.all(args.ids.map((id) => ctx.db.delete(id)));

    // Apply balance adjustments
    for (const [accountId, delta] of balanceDeltas) {
      const account = await ctx.db.get(accountId);
      if (account) {
        await ctx.db.patch(accountId, {
          balance: (account.balance ?? 0) + delta,
          updatedAt: Date.now(),
        });
      }
    }

    return { deleted: args.ids.length };
  },
});

/**
 * Bulk update category for transactions
 */
export const bulkUpdateCategory = mutation({
  args: {
    ids: v.array(v.id("transactions")),
    categoryId: v.id("categories"),
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    const accessibleAccountIds = await getAccessibleAccountIds(ctx, user._id);

    // Verify category exists
    const category = await ctx.db.get(args.categoryId);
    if (!category) {
      throw new Error("Category not found");
    }

    // Load and verify access
    const transactions = (
      await Promise.all(args.ids.map((id) => ctx.db.get(id)))
    ).filter((t) => t !== null);

    for (const t of transactions) {
      if (!accessibleAccountIds.has(t.accountId)) {
        throw new Error("Access denied to one or more transactions");
      }
    }

    // Update all
    await Promise.all(
      args.ids.map((id) => ctx.db.patch(id, { categoryId: args.categoryId })),
    );

    return { updated: args.ids.length };
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
  return Math.round((new Date(a).getTime() - new Date(b).getTime()) / msPerDay);
}
