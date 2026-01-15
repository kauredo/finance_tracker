import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";
import { getCurrentUser, requireUser, getUserHouseholdId } from "./lib/access";

/**
 * Get the current authenticated user's profile
 */
export const getCurrentUserProfile = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    if (!user) return null;

    // Also get their household info
    const householdId = await getUserHouseholdId(ctx, user._id);
    let household = null;
    if (householdId) {
      household = await ctx.db.get(householdId);
    }

    return {
      ...user,
      householdId,
      household,
    };
  },
});

/**
 * Create a new user profile (called after signup)
 */
export const createProfile = mutation({
  args: {
    email: v.string(),
    fullName: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Check if user already exists
    const existingUser = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .first();

    if (existingUser) {
      return existingUser._id;
    }

    const now = Date.now();
    return ctx.db.insert("users", {
      email: args.email,
      fullName: args.fullName,
      currency: "EUR",
      dateFormat: "DD/MM/YYYY",
      hasSeenWelcomeTour: false,
      createdAt: now,
      updatedAt: now,
    });
  },
});

/**
 * Update the current user's profile
 */
export const updateProfile = mutation({
  args: {
    fullName: v.optional(v.string()),
    currency: v.optional(v.string()),
    dateFormat: v.optional(v.string()),
    avatarUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);

    const updates: Partial<typeof args & { updatedAt: number }> = {
      updatedAt: Date.now(),
    };

    if (args.fullName !== undefined) updates.fullName = args.fullName;
    if (args.currency !== undefined) updates.currency = args.currency;
    if (args.dateFormat !== undefined) updates.dateFormat = args.dateFormat;
    if (args.avatarUrl !== undefined) updates.avatarUrl = args.avatarUrl;

    await ctx.db.patch(user._id, updates);
    return ctx.db.get(user._id);
  },
});

/**
 * Mark the welcome tour as seen
 */
export const markWelcomeTourSeen = mutation({
  args: {},
  handler: async (ctx) => {
    const user = await requireUser(ctx);
    await ctx.db.patch(user._id, {
      hasSeenWelcomeTour: true,
      updatedAt: Date.now(),
    });
  },
});

/**
 * Get user by email (for checking if email exists)
 */
export const getUserByEmail = query({
  args: { email: v.string() },
  handler: async (ctx, args) => {
    return ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .first();
  },
});
