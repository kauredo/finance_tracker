import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import {
  requireUser,
  getUserHouseholdId,
  requireHouseholdAccess,
  requireHouseholdOwnership,
  canAccessHousehold,
} from "./lib/access";

/**
 * Get the current user's household
 */
export const getCurrentHousehold = query({
  args: {},
  handler: async (ctx) => {
    const user = await requireUser(ctx);
    const householdId = await getUserHouseholdId(ctx, user._id);

    if (!householdId) {
      return null;
    }

    const household = await ctx.db.get(householdId);
    if (!household) {
      return null;
    }

    // Get all members
    const memberships = await ctx.db
      .query("householdMembers")
      .withIndex("by_household", (q) => q.eq("householdId", householdId))
      .collect();

    const members = await Promise.all(
      memberships.map(async (m) => {
        const memberUser = await ctx.db.get(m.userId);
        return {
          ...m,
          user: memberUser,
        };
      }),
    );

    return {
      ...household,
      members,
    };
  },
});

/**
 * Get household info by ID (for viewing before joining)
 */
export const getInfo = query({
  args: { id: v.id("households") },
  handler: async (ctx, args) => {
    const household = await ctx.db.get(args.id);
    if (!household) {
      throw new Error("Household not found");
    }

    // Get member count
    const members = await ctx.db
      .query("householdMembers")
      .withIndex("by_household", (q) => q.eq("householdId", args.id))
      .collect();

    return {
      _id: household._id,
      name: household.name,
      memberCount: members.length,
    };
  },
});

/**
 * Update household name
 */
export const updateName = mutation({
  args: {
    id: v.id("households"),
    name: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    await requireHouseholdOwnership(ctx, user._id, args.id);

    if (!args.name.trim()) {
      throw new Error("Household name cannot be empty");
    }

    await ctx.db.patch(args.id, {
      name: args.name.trim(),
      updatedAt: Date.now(),
    });

    return ctx.db.get(args.id);
  },
});

/**
 * Create an invite code for a household
 */
export const createInvite = mutation({
  args: {},
  handler: async (ctx) => {
    const user = await requireUser(ctx);
    const householdId = await getUserHouseholdId(ctx, user._id);

    if (!householdId) {
      throw new Error("You must be part of a household to create invites");
    }

    await requireHouseholdOwnership(ctx, user._id, householdId);

    // Generate a random invite code
    const inviteCode = Math.random()
      .toString(36)
      .substring(2, 10)
      .toUpperCase();

    // Expire in 7 days
    const expiresAt = Date.now() + 7 * 24 * 60 * 60 * 1000;

    const inviteId = await ctx.db.insert("householdInvites", {
      householdId,
      invitedByUserId: user._id,
      inviteCode,
      expiresAt,
      createdAt: Date.now(),
    });

    return {
      inviteId,
      inviteCode,
      expiresAt,
    };
  },
});

/**
 * Get invite info by code
 */
export const getInviteByCode = query({
  args: { code: v.string() },
  handler: async (ctx, args) => {
    const invite = await ctx.db
      .query("householdInvites")
      .withIndex("by_code", (q) => q.eq("inviteCode", args.code.toUpperCase()))
      .first();

    if (!invite) {
      throw new Error("Invalid invite code");
    }

    if (invite.usedAt) {
      throw new Error("This invite has already been used");
    }

    if (invite.expiresAt < Date.now()) {
      throw new Error("This invite has expired");
    }

    const household = await ctx.db.get(invite.householdId);
    const invitedBy = await ctx.db.get(invite.invitedByUserId);

    return {
      ...invite,
      household,
      invitedBy,
    };
  },
});

/**
 * Accept an invite and join a household
 */
export const acceptInvite = mutation({
  args: { code: v.string() },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);

    // Check if user is already in a household
    const existingHouseholdId = await getUserHouseholdId(ctx, user._id);
    if (existingHouseholdId) {
      throw new Error("You are already part of a household");
    }

    // Find the invite
    const invite = await ctx.db
      .query("householdInvites")
      .withIndex("by_code", (q) => q.eq("inviteCode", args.code.toUpperCase()))
      .first();

    if (!invite) {
      throw new Error("Invalid invite code");
    }

    if (invite.usedAt) {
      throw new Error("This invite has already been used");
    }

    if (invite.expiresAt < Date.now()) {
      throw new Error("This invite has expired");
    }

    const now = Date.now();

    // Add user to household as member
    await ctx.db.insert("householdMembers", {
      householdId: invite.householdId,
      userId: user._id,
      role: "member",
      joinedAt: now,
    });

    // Mark invite as used
    await ctx.db.patch(invite._id, {
      usedAt: now,
      usedByUserId: user._id,
    });

    return {
      success: true,
      householdId: invite.householdId,
    };
  },
});

/**
 * Remove a member from a household (owner only)
 */
export const removeMember = mutation({
  args: {
    householdId: v.id("households"),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    await requireHouseholdOwnership(ctx, user._id, args.householdId);

    // Can't remove yourself (owner)
    if (args.userId === user._id) {
      throw new Error("You cannot remove yourself from the household");
    }

    // Find the membership
    const membership = await ctx.db
      .query("householdMembers")
      .withIndex("by_user_and_household", (q) =>
        q.eq("userId", args.userId).eq("householdId", args.householdId),
      )
      .first();

    if (!membership) {
      throw new Error("User is not a member of this household");
    }

    await ctx.db.delete(membership._id);
    return { success: true };
  },
});

/**
 * Leave a household (for non-owners)
 */
export const leaveHousehold = mutation({
  args: { householdId: v.id("households") },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);

    // Find membership
    const membership = await ctx.db
      .query("householdMembers")
      .withIndex("by_user_and_household", (q) =>
        q.eq("userId", user._id).eq("householdId", args.householdId),
      )
      .first();

    if (!membership) {
      throw new Error("You are not a member of this household");
    }

    if (membership.role === "owner") {
      throw new Error(
        "Owners cannot leave the household. Transfer ownership first or delete the household.",
      );
    }

    await ctx.db.delete(membership._id);
    return { success: true };
  },
});

/**
 * Transfer household ownership to another member
 */
export const transferOwnership = mutation({
  args: {
    householdId: v.id("households"),
    newOwnerId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    await requireHouseholdOwnership(ctx, user._id, args.householdId);

    if (args.newOwnerId === user._id) {
      throw new Error("You are already the owner");
    }

    // Find new owner's membership
    const newOwnerMembership = await ctx.db
      .query("householdMembers")
      .withIndex("by_user_and_household", (q) =>
        q.eq("userId", args.newOwnerId).eq("householdId", args.householdId),
      )
      .first();

    if (!newOwnerMembership) {
      throw new Error("User is not a member of this household");
    }

    // Find current owner's membership
    const currentOwnerMembership = await ctx.db
      .query("householdMembers")
      .withIndex("by_user_and_household", (q) =>
        q.eq("userId", user._id).eq("householdId", args.householdId),
      )
      .first();

    if (!currentOwnerMembership) {
      throw new Error("Current owner membership not found");
    }

    // Swap roles
    await ctx.db.patch(newOwnerMembership._id, { role: "owner" });
    await ctx.db.patch(currentOwnerMembership._id, { role: "member" });

    return { success: true };
  },
});

/**
 * Join a household directly by ID (for simple invite links)
 */
export const joinByHouseholdId = mutation({
  args: { householdId: v.id("households") },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);

    // Check if household exists
    const household = await ctx.db.get(args.householdId);
    if (!household) {
      throw new Error("Household not found");
    }

    // Check if user is already in a household
    const existingHouseholdId = await getUserHouseholdId(ctx, user._id);
    if (existingHouseholdId) {
      if (existingHouseholdId === args.householdId) {
        throw new Error("You are already a member of this household");
      }
      throw new Error("You are already part of another household");
    }

    // Add user to household as member
    await ctx.db.insert("householdMembers", {
      householdId: args.householdId,
      userId: user._id,
      role: "member",
      joinedAt: Date.now(),
    });

    return {
      success: true,
      householdId: args.householdId,
    };
  },
});
