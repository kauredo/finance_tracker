import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import {
  requireUser,
  getUserHouseholdId,
  requireHouseholdAccess,
} from "./lib/access";

/**
 * List all goals for the user's household
 */
export const list = query({
  args: {},
  handler: async (ctx) => {
    const user = await requireUser(ctx);
    const householdId = await getUserHouseholdId(ctx, user._id);

    if (!householdId) {
      return [];
    }

    const goals = await ctx.db
      .query("goals")
      .withIndex("by_household", (q) => q.eq("householdId", householdId))
      .collect();

    // Sort by created date (newest first)
    return goals.sort((a, b) => b.createdAt - a.createdAt);
  },
});

/**
 * Get a single goal by ID
 */
export const getById = query({
  args: { id: v.id("goals") },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    const goal = await ctx.db.get(args.id);

    if (!goal) {
      throw new Error("Goal not found");
    }

    await requireHouseholdAccess(ctx, user._id, goal.householdId);
    return goal;
  },
});

/**
 * Create a new goal
 */
export const create = mutation({
  args: {
    name: v.string(),
    targetAmount: v.number(),
    currentAmount: v.optional(v.number()),
    targetDate: v.optional(v.string()),
    icon: v.optional(v.string()),
    color: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    const householdId = await getUserHouseholdId(ctx, user._id);

    if (!householdId) {
      throw new Error("You must be part of a household to create goals");
    }

    if (!args.name.trim()) {
      throw new Error("Goal name cannot be empty");
    }

    if (args.targetAmount <= 0) {
      throw new Error("Target amount must be greater than 0");
    }

    const now = Date.now();
    return ctx.db.insert("goals", {
      householdId,
      name: args.name.trim(),
      targetAmount: args.targetAmount,
      currentAmount: args.currentAmount ?? 0,
      targetDate: args.targetDate,
      icon: args.icon ?? "savings",
      color: args.color ?? "#10b981",
      createdAt: now,
      updatedAt: now,
    });
  },
});

/**
 * Update a goal
 */
export const update = mutation({
  args: {
    id: v.id("goals"),
    name: v.optional(v.string()),
    targetAmount: v.optional(v.number()),
    currentAmount: v.optional(v.number()),
    targetDate: v.optional(v.string()),
    icon: v.optional(v.string()),
    color: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    const goal = await ctx.db.get(args.id);

    if (!goal) {
      throw new Error("Goal not found");
    }

    await requireHouseholdAccess(ctx, user._id, goal.householdId);

    if (args.name !== undefined && !args.name.trim()) {
      throw new Error("Goal name cannot be empty");
    }

    if (args.targetAmount !== undefined && args.targetAmount <= 0) {
      throw new Error("Target amount must be greater than 0");
    }

    if (args.currentAmount !== undefined && args.currentAmount < 0) {
      throw new Error("Current amount cannot be negative");
    }

    const updates: Record<string, unknown> = { updatedAt: Date.now() };
    if (args.name !== undefined) updates.name = args.name.trim();
    if (args.targetAmount !== undefined)
      updates.targetAmount = args.targetAmount;
    if (args.currentAmount !== undefined)
      updates.currentAmount = args.currentAmount;
    if (args.targetDate !== undefined) updates.targetDate = args.targetDate;
    if (args.icon !== undefined) updates.icon = args.icon;
    if (args.color !== undefined) updates.color = args.color;

    await ctx.db.patch(args.id, updates);
    return ctx.db.get(args.id);
  },
});

/**
 * Add funds to a goal
 */
export const addFunds = mutation({
  args: {
    id: v.id("goals"),
    amount: v.number(),
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    const goal = await ctx.db.get(args.id);

    if (!goal) {
      throw new Error("Goal not found");
    }

    await requireHouseholdAccess(ctx, user._id, goal.householdId);

    if (args.amount <= 0) {
      throw new Error("Amount must be greater than 0");
    }

    const newAmount = Math.min(
      goal.currentAmount + args.amount,
      goal.targetAmount,
    );

    await ctx.db.patch(args.id, {
      currentAmount: newAmount,
      updatedAt: Date.now(),
    });

    return ctx.db.get(args.id);
  },
});

/**
 * Delete a goal
 */
export const remove = mutation({
  args: { id: v.id("goals") },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    const goal = await ctx.db.get(args.id);

    if (!goal) {
      throw new Error("Goal not found");
    }

    await requireHouseholdAccess(ctx, user._id, goal.householdId);

    await ctx.db.delete(args.id);
    return { success: true };
  },
});
