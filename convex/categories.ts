import { query, mutation, internalMutation } from "./_generated/server";
import { v } from "convex/values";
import { requireUser } from "./lib/access";

/**
 * List all categories (default + user's custom)
 */
export const list = query({
  args: {},
  handler: async (ctx) => {
    const user = await requireUser(ctx);

    // Get all non-custom (default) categories
    const defaultCategories = await ctx.db
      .query("categories")
      .withIndex("by_is_custom", (q) => q.eq("isCustom", false))
      .collect();

    // Get user's custom categories
    const customCategories = await ctx.db
      .query("categories")
      .withIndex("by_owner", (q) => q.eq("ownerId", user._id))
      .collect();

    // Combine and sort by name
    return [...defaultCategories, ...customCategories].sort((a, b) =>
      a.name.localeCompare(b.name)
    );
  },
});

/**
 * Get a single category by ID
 */
export const getById = query({
  args: { id: v.id("categories") },
  handler: async (ctx, args) => {
    const category = await ctx.db.get(args.id);
    if (!category) {
      throw new Error("Category not found");
    }

    // Check access for custom categories
    if (category.isCustom && category.ownerId) {
      const user = await requireUser(ctx);
      if (category.ownerId !== user._id) {
        throw new Error("Access denied");
      }
    }

    return category;
  },
});

/**
 * Create a custom category
 */
export const create = mutation({
  args: {
    name: v.string(),
    icon: v.optional(v.string()),
    color: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);

    if (!args.name.trim()) {
      throw new Error("Category name cannot be empty");
    }

    // Check if category with same name already exists
    const existing = await ctx.db
      .query("categories")
      .withIndex("by_name", (q) => q.eq("name", args.name))
      .first();

    if (existing) {
      // Check if it's a default category or the user's own custom category
      if (!existing.isCustom || existing.ownerId === user._id) {
        throw new Error("A category with this name already exists");
      }
    }

    return ctx.db.insert("categories", {
      name: args.name.trim(),
      icon: args.icon ?? "other",
      color: args.color ?? "#6b7280",
      isCustom: true,
      ownerId: user._id,
      createdAt: Date.now(),
    });
  },
});

/**
 * Update a custom category
 */
export const update = mutation({
  args: {
    id: v.id("categories"),
    name: v.optional(v.string()),
    icon: v.optional(v.string()),
    color: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    const category = await ctx.db.get(args.id);

    if (!category) {
      throw new Error("Category not found");
    }

    if (!category.isCustom || category.ownerId !== user._id) {
      throw new Error("You can only edit your own custom categories");
    }

    const updates: Record<string, unknown> = {};
    if (args.name !== undefined) {
      if (!args.name.trim()) {
        throw new Error("Category name cannot be empty");
      }
      updates.name = args.name.trim();
    }
    if (args.icon !== undefined) updates.icon = args.icon;
    if (args.color !== undefined) updates.color = args.color;

    await ctx.db.patch(args.id, updates);
    return ctx.db.get(args.id);
  },
});

/**
 * Delete a custom category
 */
export const remove = mutation({
  args: { id: v.id("categories") },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    const category = await ctx.db.get(args.id);

    if (!category) {
      throw new Error("Category not found");
    }

    if (!category.isCustom || category.ownerId !== user._id) {
      throw new Error("You can only delete your own custom categories");
    }

    // Check if category is used by any transactions
    const transactionsWithCategory = await ctx.db
      .query("transactions")
      .withIndex("by_category", (q) => q.eq("categoryId", args.id))
      .first();

    if (transactionsWithCategory) {
      throw new Error(
        "Cannot delete category that is used by transactions. Please reassign transactions first."
      );
    }

    await ctx.db.delete(args.id);
    return { success: true };
  },
});

/**
 * Seed default categories (internal mutation for setup)
 */
export const seedDefaultCategories = internalMutation({
  args: {},
  handler: async (ctx) => {
    const defaultCategories = [
      { name: "Groceries", color: "#10b981", icon: "groceries" },
      { name: "Dining", color: "#f59e0b", icon: "dining" },
      { name: "Transport", color: "#3b82f6", icon: "transport" },
      { name: "Utilities", color: "#8b5cf6", icon: "utilities" },
      { name: "Entertainment", color: "#ec4899", icon: "entertainment" },
      { name: "Shopping", color: "#f43f5e", icon: "shopping" },
      { name: "Healthcare", color: "#06b6d4", icon: "healthcare" },
      { name: "Income", color: "#22c55e", icon: "income" },
      { name: "Other", color: "#6b7280", icon: "other" },
    ];

    const now = Date.now();

    for (const cat of defaultCategories) {
      // Check if already exists
      const existing = await ctx.db
        .query("categories")
        .withIndex("by_name", (q) => q.eq("name", cat.name))
        .first();

      if (!existing) {
        await ctx.db.insert("categories", {
          name: cat.name,
          color: cat.color,
          icon: cat.icon,
          isCustom: false,
          createdAt: now,
        });
      }
    }
  },
});
