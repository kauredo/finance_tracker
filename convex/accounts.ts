import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import {
  requireUser,
  getUserHouseholdId,
  canAccessAccount,
  requireAccountAccess,
  getUserHouseholdIds,
} from "./lib/access";

/**
 * List all accounts the current user can access
 */
export const list = query({
  args: {},
  handler: async (ctx) => {
    const user = await requireUser(ctx);

    // Get personal accounts
    const personalAccounts = await ctx.db
      .query("accounts")
      .withIndex("by_owner", (q) => q.eq("ownerId", user._id))
      .collect();

    // Get household accounts (parallel)
    const householdIds = await getUserHouseholdIds(ctx, user._id);
    const householdAccountArrays = await Promise.all(
      householdIds.map((householdId) =>
        ctx.db
          .query("accounts")
          .withIndex("by_household", (q) => q.eq("householdId", householdId))
          .collect(),
      ),
    );
    const householdAccounts = householdAccountArrays.flat();

    // Combine and sort by name
    return [...personalAccounts, ...householdAccounts].sort((a, b) =>
      a.name.localeCompare(b.name),
    );
  },
});

/**
 * Get a single account by ID
 */
export const getById = query({
  args: { id: v.id("accounts") },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    const account = await ctx.db.get(args.id);

    if (!account) {
      throw new Error("Account not found");
    }

    const hasAccess = await canAccessAccount(ctx, user._id, args.id);
    if (!hasAccess) {
      throw new Error("Access denied");
    }

    return account;
  },
});

/**
 * Create a new account
 */
export const create = mutation({
  args: {
    name: v.string(),
    type: v.union(
      v.literal("checking"),
      v.literal("savings"),
      v.literal("credit"),
      v.literal("personal"),
      v.literal("joint"),
    ),
    balance: v.optional(v.number()),
    startingBalance: v.optional(v.number()),
    startingBalanceDate: v.optional(v.string()),
    color: v.optional(v.string()),
    icon: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    const now = Date.now();

    if (args.type === "joint") {
      // Create household first
      const householdId = await ctx.db.insert("households", {
        name: `${args.name} Household`,
        createdAt: now,
      });

      // Add user as owner
      await ctx.db.insert("householdMembers", {
        householdId,
        userId: user._id,
        role: "owner",
        joinedAt: now,
      });

      // Create joint account
      return ctx.db.insert("accounts", {
        name: args.name,
        type: args.type,
        balance: args.startingBalance ?? 0,
        startingBalance: args.startingBalance,
        startingBalanceDate: args.startingBalanceDate,
        color: args.color,
        icon: args.icon,
        householdId,
        createdAt: now,
        updatedAt: now,
      });
    }

    // Personal account
    return ctx.db.insert("accounts", {
      name: args.name,
      type: args.type,
      balance: args.startingBalance ?? 0,
      startingBalance: args.startingBalance,
      startingBalanceDate: args.startingBalanceDate,
      color: args.color,
      icon: args.icon,
      ownerId: user._id,
      createdAt: now,
      updatedAt: now,
    });
  },
});

/**
 * Update an account
 */
export const update = mutation({
  args: {
    id: v.id("accounts"),
    name: v.optional(v.string()),
    type: v.optional(
      v.union(
        v.literal("checking"),
        v.literal("savings"),
        v.literal("credit"),
        v.literal("personal"),
        v.literal("joint"),
      ),
    ),
    startingBalance: v.optional(v.number()),
    startingBalanceDate: v.optional(v.string()),
    color: v.optional(v.string()),
    icon: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    await requireAccountAccess(ctx, user._id, args.id);

    const { id, ...updates } = args;
    const patchData: Record<string, unknown> = { updatedAt: Date.now() };

    if (updates.name !== undefined) patchData.name = updates.name;
    if (updates.type !== undefined) patchData.type = updates.type;
    if (updates.color !== undefined) patchData.color = updates.color;
    if (updates.icon !== undefined) patchData.icon = updates.icon;

    const anchorChanged =
      updates.startingBalance !== undefined ||
      updates.startingBalanceDate !== undefined;

    if (anchorChanged) {
      const account = await ctx.db.get(id);
      if (!account) throw new Error("Account not found");

      const newStarting =
        updates.startingBalance !== undefined
          ? updates.startingBalance
          : (account.startingBalance ?? 0);
      const newDate =
        updates.startingBalanceDate !== undefined
          ? updates.startingBalanceDate
          : account.startingBalanceDate;

      patchData.startingBalance = newStarting;
      patchData.startingBalanceDate = newDate;

      // Recalculate balance from scratch
      const transactions = await ctx.db
        .query("transactions")
        .withIndex("by_account", (q) => q.eq("accountId", id))
        .collect();

      const txSum = transactions
        .filter((t) => !newDate || t.date >= newDate)
        .reduce((sum, t) => sum + t.amount, 0);

      patchData.balance = (newStarting ?? 0) + txSum;
    }

    await ctx.db.patch(id, patchData);
    return ctx.db.get(id);
  },
});

/**
 * Delete an account
 */
export const remove = mutation({
  args: { id: v.id("accounts") },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    await requireAccountAccess(ctx, user._id, args.id);

    // Check for existing transactions
    const transactions = await ctx.db
      .query("transactions")
      .withIndex("by_account", (q) => q.eq("accountId", args.id))
      .first();

    if (transactions) {
      throw new Error("Cannot delete account with existing transactions");
    }

    await ctx.db.delete(args.id);
    return { success: true };
  },
});

/**
 * Recalculate account balance from transactions
 */
export const recalculateBalance = mutation({
  args: { id: v.id("accounts") },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    await requireAccountAccess(ctx, user._id, args.id);

    const account = await ctx.db.get(args.id);
    if (!account) throw new Error("Account not found");

    const anchorDate = account.startingBalanceDate;

    const transactions = await ctx.db
      .query("transactions")
      .withIndex("by_account", (q) => q.eq("accountId", args.id))
      .collect();

    const txSum = transactions
      .filter((t) => !anchorDate || t.date >= anchorDate)
      .reduce((sum, t) => sum + t.amount, 0);

    const balance = (account.startingBalance ?? 0) + txSum;

    await ctx.db.patch(args.id, {
      balance,
      updatedAt: Date.now(),
    });

    return { balance };
  },
});
