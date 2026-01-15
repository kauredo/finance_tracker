import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { requireAdmin, getCurrentUser } from "./lib/access";

/**
 * Get the current user's status (for frontend to check admin/confirmed)
 */
export const getCurrentUserStatus = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    if (!user) {
      return null;
    }
    return {
      _id: user._id,
      email: user.email,
      fullName: user.fullName,
      isAdmin: user.isAdmin ?? false,
      isConfirmed: user.isConfirmed ?? false,
    };
  },
});

/**
 * List all users (admin only)
 */
export const listUsers = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);

    const users = await ctx.db.query("users").collect();

    return users.map((user) => ({
      _id: user._id,
      email: user.email,
      fullName: user.fullName,
      isAdmin: user.isAdmin ?? false,
      isConfirmed: user.isConfirmed ?? false,
      createdAt: user.createdAt,
    }));
  },
});

/**
 * Confirm a user (admin only)
 */
export const confirmUser = mutation({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const admin = await requireAdmin(ctx);

    // Can't unconfirm yourself
    if (args.userId === admin._id) {
      throw new Error("You cannot modify your own confirmation status");
    }

    const user = await ctx.db.get(args.userId);
    if (!user) {
      throw new Error("User not found");
    }

    await ctx.db.patch(args.userId, {
      isConfirmed: true,
      updatedAt: Date.now(),
    });

    return { success: true };
  },
});

/**
 * Unconfirm a user (admin only)
 */
export const unconfirmUser = mutation({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const admin = await requireAdmin(ctx);

    // Can't unconfirm yourself
    if (args.userId === admin._id) {
      throw new Error("You cannot modify your own confirmation status");
    }

    const user = await ctx.db.get(args.userId);
    if (!user) {
      throw new Error("User not found");
    }

    // Can't unconfirm another admin
    if (user.isAdmin) {
      throw new Error("Cannot unconfirm an admin user");
    }

    await ctx.db.patch(args.userId, {
      isConfirmed: false,
      updatedAt: Date.now(),
    });

    return { success: true };
  },
});

/**
 * Set admin status for a user (admin only)
 */
export const setAdminStatus = mutation({
  args: {
    userId: v.id("users"),
    isAdmin: v.boolean(),
  },
  handler: async (ctx, args) => {
    const admin = await requireAdmin(ctx);

    // Can't change your own admin status
    if (args.userId === admin._id) {
      throw new Error("You cannot modify your own admin status");
    }

    const user = await ctx.db.get(args.userId);
    if (!user) {
      throw new Error("User not found");
    }

    // If making someone admin, they must be confirmed
    if (args.isAdmin && !user.isConfirmed) {
      throw new Error("User must be confirmed before being made admin");
    }

    await ctx.db.patch(args.userId, {
      isAdmin: args.isAdmin,
      updatedAt: Date.now(),
    });

    return { success: true };
  },
});

/**
 * Delete a user (admin only)
 */
export const deleteUser = mutation({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const admin = await requireAdmin(ctx);

    // Can't delete yourself
    if (args.userId === admin._id) {
      throw new Error("You cannot delete your own account");
    }

    const user = await ctx.db.get(args.userId);
    if (!user) {
      throw new Error("User not found");
    }

    // Can't delete another admin
    if (user.isAdmin) {
      throw new Error("Cannot delete an admin user");
    }

    // Delete associated data
    // 1. Remove from households
    const memberships = await ctx.db
      .query("householdMembers")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();
    for (const membership of memberships) {
      await ctx.db.delete(membership._id);
    }

    // 2. Delete statements
    const statements = await ctx.db
      .query("statements")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();
    for (const statement of statements) {
      await ctx.db.delete(statement._id);
    }

    // 3. Delete personal accounts and their transactions
    const personalAccounts = await ctx.db
      .query("accounts")
      .withIndex("by_owner", (q) => q.eq("ownerId", args.userId))
      .collect();
    for (const account of personalAccounts) {
      const transactions = await ctx.db
        .query("transactions")
        .withIndex("by_account", (q) => q.eq("accountId", account._id))
        .collect();
      for (const tx of transactions) {
        await ctx.db.delete(tx._id);
      }
      await ctx.db.delete(account._id);
    }

    // 4. Delete the user
    await ctx.db.delete(args.userId);

    return { success: true };
  },
});
