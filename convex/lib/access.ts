import { QueryCtx, MutationCtx } from "../_generated/server";
import { Id } from "../_generated/dataModel";
import { getAuthUserId } from "@convex-dev/auth/server";

/**
 * Get the current authenticated user from the database
 */
export async function getCurrentUser(ctx: QueryCtx | MutationCtx) {
  const userId = await getAuthUserId(ctx);
  if (!userId) {
    return null;
  }

  return ctx.db.get(userId);
}

/**
 * Get the current user or throw an error if not authenticated
 */
export async function requireUser(ctx: QueryCtx | MutationCtx) {
  const user = await getCurrentUser(ctx);
  if (!user) {
    throw new Error("Unauthorized: You must be logged in");
  }
  return user;
}

/**
 * Get the current user and require they are confirmed
 */
export async function requireConfirmedUser(ctx: QueryCtx | MutationCtx) {
  const user = await requireUser(ctx);
  if (!user.isConfirmed) {
    throw new Error("Access denied: Your account is pending confirmation");
  }
  return user;
}

/**
 * Get the current user and require they are an admin
 */
export async function requireAdmin(ctx: QueryCtx | MutationCtx) {
  const user = await requireConfirmedUser(ctx);
  if (!user.isAdmin) {
    throw new Error("Access denied: Admin privileges required");
  }
  return user;
}

/**
 * Get the household ID for a user (first household they're a member of)
 */
export async function getUserHouseholdId(
  ctx: QueryCtx | MutationCtx,
  userId: Id<"users">,
): Promise<Id<"households"> | null> {
  const membership = await ctx.db
    .query("householdMembers")
    .withIndex("by_user", (q) => q.eq("userId", userId))
    .first();
  return membership?.householdId ?? null;
}

/**
 * Get all household IDs for a user
 */
export async function getUserHouseholdIds(
  ctx: QueryCtx | MutationCtx,
  userId: Id<"users">,
): Promise<Id<"households">[]> {
  const memberships = await ctx.db
    .query("householdMembers")
    .withIndex("by_user", (q) => q.eq("userId", userId))
    .collect();
  return memberships.map((m) => m.householdId);
}

/**
 * Check if a user can access a specific household
 */
export async function canAccessHousehold(
  ctx: QueryCtx | MutationCtx,
  userId: Id<"users">,
  householdId: Id<"households">,
): Promise<boolean> {
  const membership = await ctx.db
    .query("householdMembers")
    .withIndex("by_user_and_household", (q) =>
      q.eq("userId", userId).eq("householdId", householdId),
    )
    .first();
  return !!membership;
}

/**
 * Check if a user is an owner of a household
 */
export async function isHouseholdOwner(
  ctx: QueryCtx | MutationCtx,
  userId: Id<"users">,
  householdId: Id<"households">,
): Promise<boolean> {
  const membership = await ctx.db
    .query("householdMembers")
    .withIndex("by_user_and_household", (q) =>
      q.eq("userId", userId).eq("householdId", householdId),
    )
    .first();
  return membership?.role === "owner";
}

/**
 * Check if a user can access a specific account
 * - Personal accounts: only owner can access
 * - Household accounts: any household member can access
 */
export async function canAccessAccount(
  ctx: QueryCtx | MutationCtx,
  userId: Id<"users">,
  accountId: Id<"accounts">,
): Promise<boolean> {
  const account = await ctx.db.get(accountId);
  if (!account) return false;

  // Personal account - owner only
  if (account.ownerId) {
    return account.ownerId === userId;
  }

  // Household account - any household member
  if (account.householdId) {
    return canAccessHousehold(ctx, userId, account.householdId);
  }

  return false;
}

/**
 * Get all account IDs a user can access
 */
export async function getAccessibleAccountIds(
  ctx: QueryCtx | MutationCtx,
  userId: Id<"users">,
): Promise<Set<Id<"accounts">>> {
  // Get personal accounts
  const personalAccounts = await ctx.db
    .query("accounts")
    .withIndex("by_owner", (q) => q.eq("ownerId", userId))
    .collect();

  // Get household accounts (parallel)
  const householdIds = await getUserHouseholdIds(ctx, userId);
  const householdAccountArrays = await Promise.all(
    householdIds.map((householdId) =>
      ctx.db
        .query("accounts")
        .withIndex("by_household", (q) => q.eq("householdId", householdId))
        .collect(),
    ),
  );
  const householdAccounts = householdAccountArrays.flat();

  return new Set([
    ...personalAccounts.map((a) => a._id),
    ...householdAccounts.map((a) => a._id),
  ]);
}

/**
 * Require access to an account or throw an error
 */
export async function requireAccountAccess(
  ctx: QueryCtx | MutationCtx,
  userId: Id<"users">,
  accountId: Id<"accounts">,
) {
  const hasAccess = await canAccessAccount(ctx, userId, accountId);
  if (!hasAccess) {
    throw new Error("Access denied: You do not have access to this account");
  }
}

/**
 * Require access to a household or throw an error
 */
export async function requireHouseholdAccess(
  ctx: QueryCtx | MutationCtx,
  userId: Id<"users">,
  householdId: Id<"households">,
) {
  const hasAccess = await canAccessHousehold(ctx, userId, householdId);
  if (!hasAccess) {
    throw new Error("Access denied: You do not have access to this household");
  }
}

/**
 * Require ownership of a household or throw an error
 */
export async function requireHouseholdOwnership(
  ctx: QueryCtx | MutationCtx,
  userId: Id<"users">,
  householdId: Id<"households">,
) {
  const isOwner = await isHouseholdOwner(ctx, userId, householdId);
  if (!isOwner) {
    throw new Error(
      "Access denied: You must be the owner of this household to perform this action",
    );
  }
}
