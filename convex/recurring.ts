import { query, mutation, internalMutation } from "./_generated/server";
import { v } from "convex/values";
import {
  requireUser,
  getUserHouseholdId,
  requireHouseholdAccess,
} from "./lib/access";
import { internal } from "./_generated/api";

/**
 * List all recurring transactions for the user's household
 */
export const list = query({
  args: {},
  handler: async (ctx) => {
    const user = await requireUser(ctx);
    const householdId = await getUserHouseholdId(ctx, user._id);

    if (!householdId) {
      return [];
    }

    const recurring = await ctx.db
      .query("recurringTransactions")
      .withIndex("by_household", (q) => q.eq("householdId", householdId))
      .collect();

    // Enrich with category and account data
    const enriched = await Promise.all(
      recurring.map(async (r) => {
        const category = r.categoryId ? await ctx.db.get(r.categoryId) : null;
        const account = r.accountId ? await ctx.db.get(r.accountId) : null;
        return {
          ...r,
          category,
          account,
        };
      }),
    );

    // Sort by next run date
    return enriched.sort((a, b) => a.nextRunDate.localeCompare(b.nextRunDate));
  },
});

/**
 * Get a single recurring transaction by ID
 */
export const getById = query({
  args: { id: v.id("recurringTransactions") },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    const recurring = await ctx.db.get(args.id);

    if (!recurring) {
      throw new Error("Recurring transaction not found");
    }

    await requireHouseholdAccess(ctx, user._id, recurring.householdId);

    const category = recurring.categoryId
      ? await ctx.db.get(recurring.categoryId)
      : null;
    const account = recurring.accountId
      ? await ctx.db.get(recurring.accountId)
      : null;

    return { ...recurring, category, account };
  },
});

/**
 * Create a new recurring transaction
 */
export const create = mutation({
  args: {
    accountId: v.optional(v.id("accounts")),
    categoryId: v.optional(v.id("categories")),
    description: v.string(),
    amount: v.number(),
    interval: v.union(
      v.literal("daily"),
      v.literal("weekly"),
      v.literal("monthly"),
      v.literal("yearly"),
    ),
    dayOfMonth: v.optional(v.number()),
    dayOfWeek: v.optional(v.number()),
    nextRunDate: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    const householdId = await getUserHouseholdId(ctx, user._id);

    if (!householdId) {
      throw new Error(
        "You must be part of a household to create recurring transactions",
      );
    }

    if (!args.description.trim()) {
      throw new Error("Description cannot be empty");
    }

    // Validate day fields based on interval
    if (args.interval === "monthly" && args.dayOfMonth !== undefined) {
      if (args.dayOfMonth < 1 || args.dayOfMonth > 31) {
        throw new Error("Day of month must be between 1 and 31");
      }
    }

    if (args.interval === "weekly" && args.dayOfWeek !== undefined) {
      if (args.dayOfWeek < 0 || args.dayOfWeek > 6) {
        throw new Error(
          "Day of week must be between 0 (Sunday) and 6 (Saturday)",
        );
      }
    }

    const now = Date.now();
    return ctx.db.insert("recurringTransactions", {
      householdId,
      accountId: args.accountId,
      categoryId: args.categoryId,
      description: args.description.trim(),
      amount: args.amount,
      interval: args.interval,
      dayOfMonth: args.dayOfMonth,
      dayOfWeek: args.dayOfWeek,
      nextRunDate: args.nextRunDate,
      active: true,
      createdAt: now,
      updatedAt: now,
    });
  },
});

/**
 * Update a recurring transaction
 */
export const update = mutation({
  args: {
    id: v.id("recurringTransactions"),
    accountId: v.optional(v.id("accounts")),
    categoryId: v.optional(v.id("categories")),
    description: v.optional(v.string()),
    amount: v.optional(v.number()),
    interval: v.optional(
      v.union(
        v.literal("daily"),
        v.literal("weekly"),
        v.literal("monthly"),
        v.literal("yearly"),
      ),
    ),
    dayOfMonth: v.optional(v.number()),
    dayOfWeek: v.optional(v.number()),
    nextRunDate: v.optional(v.string()),
    active: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    const recurring = await ctx.db.get(args.id);

    if (!recurring) {
      throw new Error("Recurring transaction not found");
    }

    await requireHouseholdAccess(ctx, user._id, recurring.householdId);

    if (args.description !== undefined && !args.description.trim()) {
      throw new Error("Description cannot be empty");
    }

    const updates: Record<string, unknown> = { updatedAt: Date.now() };
    if (args.accountId !== undefined) updates.accountId = args.accountId;
    if (args.categoryId !== undefined) updates.categoryId = args.categoryId;
    if (args.description !== undefined)
      updates.description = args.description.trim();
    if (args.amount !== undefined) updates.amount = args.amount;
    if (args.interval !== undefined) updates.interval = args.interval;
    if (args.dayOfMonth !== undefined) updates.dayOfMonth = args.dayOfMonth;
    if (args.dayOfWeek !== undefined) updates.dayOfWeek = args.dayOfWeek;
    if (args.nextRunDate !== undefined) updates.nextRunDate = args.nextRunDate;
    if (args.active !== undefined) updates.active = args.active;

    await ctx.db.patch(args.id, updates);
    return ctx.db.get(args.id);
  },
});

/**
 * Delete a recurring transaction
 */
export const remove = mutation({
  args: { id: v.id("recurringTransactions") },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    const recurring = await ctx.db.get(args.id);

    if (!recurring) {
      throw new Error("Recurring transaction not found");
    }

    await requireHouseholdAccess(ctx, user._id, recurring.householdId);

    await ctx.db.delete(args.id);
    return { success: true };
  },
});

/**
 * Toggle active state of a recurring transaction
 */
export const toggleActive = mutation({
  args: { id: v.id("recurringTransactions") },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    const recurring = await ctx.db.get(args.id);

    if (!recurring) {
      throw new Error("Recurring transaction not found");
    }

    await requireHouseholdAccess(ctx, user._id, recurring.householdId);

    await ctx.db.patch(args.id, {
      active: !recurring.active,
      updatedAt: Date.now(),
    });

    return ctx.db.get(args.id);
  },
});

/**
 * Calculate the next run date based on interval
 */
function calculateNextRunDate(
  currentDate: string,
  interval: "daily" | "weekly" | "monthly" | "yearly",
  dayOfMonth?: number,
  dayOfWeek?: number,
): string {
  const date = new Date(currentDate);

  switch (interval) {
    case "daily":
      date.setDate(date.getDate() + 1);
      break;
    case "weekly":
      date.setDate(date.getDate() + 7);
      break;
    case "monthly":
      date.setMonth(date.getMonth() + 1);
      if (dayOfMonth) {
        date.setDate(
          Math.min(
            dayOfMonth,
            new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate(),
          ),
        );
      }
      break;
    case "yearly":
      date.setFullYear(date.getFullYear() + 1);
      break;
  }

  return date.toISOString().split("T")[0];
}

/**
 * Process due recurring transactions (internal, called by cron)
 */
export const processAll = internalMutation({
  args: {},
  handler: async (ctx) => {
    const today = new Date().toISOString().split("T")[0];

    // Get all active recurring transactions due today or earlier
    const dueTransactions = await ctx.db
      .query("recurringTransactions")
      .withIndex("by_active", (q) => q.eq("active", true))
      .collect();

    const toProcess = dueTransactions.filter((r) => r.nextRunDate <= today);

    let createdCount = 0;

    for (const recurring of toProcess) {
      if (!recurring.accountId) continue;

      // Get household owner to attribute the transaction
      const householdMembers = await ctx.db
        .query("householdMembers")
        .withIndex("by_household", (q) =>
          q.eq("householdId", recurring.householdId),
        )
        .collect();

      const owner = householdMembers.find((m) => m.role === "owner");
      if (!owner) continue;

      // Create the transaction
      await ctx.db.insert("transactions", {
        accountId: recurring.accountId,
        categoryId: recurring.categoryId,
        userId: owner.userId,
        date: recurring.nextRunDate,
        description: recurring.description,
        amount: recurring.amount,
        isRecurring: true,
        createdAt: Date.now(),
      });

      // Update account balance
      const account = await ctx.db.get(recurring.accountId);
      if (account) {
        await ctx.db.patch(recurring.accountId, {
          balance: (account.balance ?? 0) + recurring.amount,
          updatedAt: Date.now(),
        });
      }

      // Calculate and set next run date
      const nextRunDate = calculateNextRunDate(
        recurring.nextRunDate,
        recurring.interval,
        recurring.dayOfMonth ?? undefined,
        recurring.dayOfWeek ?? undefined,
      );

      await ctx.db.patch(recurring._id, {
        lastRunDate: recurring.nextRunDate,
        nextRunDate,
        updatedAt: Date.now(),
      });

      createdCount++;
    }

    return { processed: createdCount };
  },
});
