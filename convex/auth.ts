import { convexAuth } from "@convex-dev/auth/server";
import { Password } from "@convex-dev/auth/providers/Password";
import { DataModel } from "./_generated/dataModel";

export const { auth, signIn, signOut, store } = convexAuth({
  providers: [Password],
  callbacks: {
    async createOrUpdateUser(ctx, args) {
      if (args.existingUserId) {
        // Update existing user - just update the timestamp
        await ctx.db.patch(args.existingUserId, {
          updatedAt: Date.now(),
        });
        return args.existingUserId;
      }

      // Create new user with required fields
      const now = Date.now();
      return await ctx.db.insert("users", {
        email: args.profile.email!,
        fullName: args.profile.name,
        avatarUrl: args.profile.image,
        createdAt: now,
        updatedAt: now,
      });
    },
  },
});
