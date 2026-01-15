import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import {
  requireUser,
  getUserHouseholdId,
  requireHouseholdAccess,
} from "./lib/access";

/**
 * List all budgets for the user's household
 */
export const list = query({
  args: {},
  handler: async (ctx) => {
    const user = await requireUser(ctx);
    const householdId = await getUserHouseholdId(ctx, user._id);

    if (!householdId) {
      return [];
    }

    const budgets = await ctx.db
      .query("budgets")
      .withIndex("by_household", (q) => q.eq("householdId", householdId))
      .collect();

    // Enrich with category data
    const enriched = await Promise.all(
      budgets.map(async (budget) => {
        const category = await ctx.db.get(budget.categoryId);
        return {
          ...budget,
          category,
        };
      })
    );

    return enriched;
  },
});

/**
 * Get a single budget by ID
 */
export const getById = query({
  args: { id: v.id("budgets") },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    const budget = await ctx.db.get(args.id);

    if (!budget) {
      throw new Error("Budget not found");
    }

    await requireHouseholdAccess(ctx, user._id, budget.householdId);

    const category = await ctx.db.get(budget.categoryId);
    return { ...budget, category };
  },
});

/**
 * Create or update a budget (upsert by household + category)
 */
export const upsert = mutation({
  args: {
    categoryId: v.id("categories"),
    amount: v.number(),
    period: v.union(
      v.literal("weekly"),
      v.literal("monthly"),
      v.literal("yearly")
    ),
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    const householdId = await getUserHouseholdId(ctx, user._id);

    if (!householdId) {
      throw new Error("You must be part of a household to create budgets");
    }

    if (args.amount <= 0) {
      throw new Error("Budget amount must be greater than 0");
    }

    const now = Date.now();

    // Check if budget already exists for this category
    const existing = await ctx.db
      .query("budgets")
      .withIndex("by_household_and_category", (q) =>
        q.eq("householdId", householdId).eq("categoryId", args.categoryId)
      )
      .first();

    if (existing) {
      // Update existing budget
      await ctx.db.patch(existing._id, {
        amount: args.amount,
        period: args.period,
        updatedAt: now,
      });
      return existing._id;
    }

    // Create new budget
    return ctx.db.insert("budgets", {
      householdId,
      categoryId: args.categoryId,
      amount: args.amount,
      period: args.period,
      createdAt: now,
      updatedAt: now,
    });
  },
});

/**
 * Update a budget
 */
export const update = mutation({
  args: {
    id: v.id("budgets"),
    amount: v.optional(v.number()),
    period: v.optional(
      v.union(
        v.literal("weekly"),
        v.literal("monthly"),
        v.literal("yearly")
      )
    ),
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    const budget = await ctx.db.get(args.id);

    if (!budget) {
      throw new Error("Budget not found");
    }

    await requireHouseholdAccess(ctx, user._id, budget.householdId);

    if (args.amount !== undefined && args.amount <= 0) {
      throw new Error("Budget amount must be greater than 0");
    }

    const updates: Record<string, unknown> = { updatedAt: Date.now() };
    if (args.amount !== undefined) updates.amount = args.amount;
    if (args.period !== undefined) updates.period = args.period;

    await ctx.db.patch(args.id, updates);
    return ctx.db.get(args.id);
  },
});

/**
 * Delete a budget
 */
export const remove = mutation({
  args: { id: v.id("budgets") },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    const budget = await ctx.db.get(args.id);

    if (!budget) {
      throw new Error("Budget not found");
    }

    await requireHouseholdAccess(ctx, user._id, budget.householdId);

    await ctx.db.delete(args.id);
    return { success: true };
  },
});

/**
 * Get budget progress (spent vs budget amount)
 */
export const getProgress = query({
  args: {
    dateFrom: v.string(),
    dateTo: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    const householdId = await getUserHouseholdId(ctx, user._id);

    if (!householdId) {
      return [];
    }

    const budgets = await ctx.db
      .query("budgets")
      .withIndex("by_household", (q) => q.eq("householdId", householdId))
      .collect();

    // Get all transactions in the date range
    const transactions = await ctx.db
      .query("transactions")
      .withIndex("by_date")
      .collect();

    const filteredTransactions = transactions.filter(
      (t) => t.date >= args.dateFrom && t.date <= args.dateTo
    );

    // Calculate spent per category
    const spentByCategory: Record<string, number> = {};
    for (const t of filteredTransactions) {
      if (t.categoryId && t.amount < 0) {
        const key = t.categoryId;
        spentByCategory[key] = (spentByCategory[key] ?? 0) + Math.abs(t.amount);
      }
    }

    // Combine budgets with spent amounts
    const progress = await Promise.all(
      budgets.map(async (budget) => {
        const category = await ctx.db.get(budget.categoryId);
        const spent = spentByCategory[budget.categoryId] ?? 0;
        const percentage = budget.amount > 0 ? (spent / budget.amount) * 100 : 0;

        return {
          ...budget,
          category,
          spent,
          remaining: Math.max(0, budget.amount - spent),
          percentage: Math.min(100, percentage),
          isOverBudget: spent > budget.amount,
        };
      })
    );

    return progress;
  },
});
