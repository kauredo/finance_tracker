import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { authTables } from "@convex-dev/auth/server";

export default defineSchema({
  ...authTables,
  // Users - profile data (linked to Convex Auth)
  users: defineTable({
    email: v.string(),
    fullName: v.optional(v.string()),
    avatarUrl: v.optional(v.string()),
    currency: v.optional(v.string()), // default 'EUR'
    dateFormat: v.optional(v.string()), // default 'DD/MM/YYYY'
    hasSeenWelcomeTour: v.optional(v.boolean()),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_email", ["email"]),

  // Households - shared accounts for couples
  households: defineTable({
    name: v.string(),
    createdAt: v.number(),
    updatedAt: v.optional(v.number()),
  }),

  // Household Members - junction table with roles
  householdMembers: defineTable({
    householdId: v.id("households"),
    userId: v.id("users"),
    role: v.union(v.literal("owner"), v.literal("member")),
    joinedAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_household", ["householdId"])
    .index("by_user_and_household", ["userId", "householdId"]),

  // Accounts - bank accounts (personal or joint)
  accounts: defineTable({
    name: v.string(),
    type: v.union(
      v.literal("checking"),
      v.literal("savings"),
      v.literal("credit"),
      v.literal("personal"),
      v.literal("joint"),
    ),
    balance: v.optional(v.number()), // calculated from transactions
    color: v.optional(v.string()),
    icon: v.optional(v.string()),
    // Either owned by user OR household (for joint accounts)
    ownerId: v.optional(v.id("users")),
    householdId: v.optional(v.id("households")),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_owner", ["ownerId"])
    .index("by_household", ["householdId"]),

  // Categories - default + custom
  categories: defineTable({
    name: v.string(),
    icon: v.optional(v.string()),
    color: v.optional(v.string()),
    isCustom: v.boolean(),
    ownerId: v.optional(v.id("users")), // null for default categories
    createdAt: v.number(),
  })
    .index("by_owner", ["ownerId"])
    .index("by_name", ["name"])
    .index("by_is_custom", ["isCustom"]),

  // Transactions
  transactions: defineTable({
    accountId: v.id("accounts"),
    categoryId: v.optional(v.id("categories")),
    userId: v.id("users"), // who created it
    date: v.string(), // ISO date string (YYYY-MM-DD)
    description: v.string(),
    amount: v.number(), // negative for expenses, positive for income
    notes: v.optional(v.string()),
    isRecurring: v.optional(v.boolean()),
    createdAt: v.number(),
  })
    .index("by_account", ["accountId"])
    .index("by_category", ["categoryId"])
    .index("by_user", ["userId"])
    .index("by_date", ["date"])
    .index("by_account_and_date", ["accountId", "date"]),

  // Budgets - per category per household
  budgets: defineTable({
    householdId: v.id("households"),
    categoryId: v.id("categories"),
    amount: v.number(),
    period: v.union(
      v.literal("weekly"),
      v.literal("monthly"),
      v.literal("yearly"),
    ),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_household", ["householdId"])
    .index("by_category", ["categoryId"])
    .index("by_household_and_category", ["householdId", "categoryId"]),

  // Goals - savings goals
  goals: defineTable({
    householdId: v.id("households"),
    name: v.string(),
    targetAmount: v.number(),
    currentAmount: v.number(),
    targetDate: v.optional(v.string()), // ISO date string
    icon: v.optional(v.string()),
    color: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_household", ["householdId"]),

  // Recurring Transactions
  recurringTransactions: defineTable({
    householdId: v.id("households"),
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
    dayOfMonth: v.optional(v.number()), // 1-31
    dayOfWeek: v.optional(v.number()), // 0-6 (Sunday = 0)
    nextRunDate: v.string(), // ISO date string
    lastRunDate: v.optional(v.string()),
    active: v.boolean(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_household", ["householdId"])
    .index("by_next_run", ["nextRunDate", "active"])
    .index("by_active", ["active"]),

  // Statements - uploaded bank statements metadata
  statements: defineTable({
    userId: v.id("users"),
    accountId: v.id("accounts"),
    fileName: v.string(),
    storageId: v.optional(v.id("_storage")), // Convex file storage
    fileType: v.string(),
    processed: v.optional(v.boolean()),
    transactionCount: v.optional(v.number()),
    createdAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_account", ["accountId"]),

  // Household Invites - for inviting partners
  householdInvites: defineTable({
    householdId: v.id("households"),
    invitedByUserId: v.id("users"),
    inviteCode: v.string(),
    expiresAt: v.number(),
    usedAt: v.optional(v.number()),
    usedByUserId: v.optional(v.id("users")),
    createdAt: v.number(),
  })
    .index("by_household", ["householdId"])
    .index("by_code", ["inviteCode"]),
});
