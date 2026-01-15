"use client";

import { createContext, useContext, useCallback } from "react";
import { useConvexAuth, useMutation, useQuery } from "convex/react";
import { useAuthActions } from "@convex-dev/auth/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";

interface User {
  _id: Id<"users">;
  email: string;
  fullName?: string;
  avatarUrl?: string;
  currency?: string;
  dateFormat?: string;
  hasSeenWelcomeTour?: boolean;
  householdId?: Id<"households"> | null;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  isAuthenticated: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, fullName: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { isLoading, isAuthenticated } = useConvexAuth();
  const { signIn: convexSignIn, signOut: convexSignOut } = useAuthActions();

  // Query for current user profile
  const userProfile = useQuery(
    api.users.getCurrentUserProfile,
    isAuthenticated ? {} : "skip"
  );

  // Mutation to create profile after signup
  const createProfile = useMutation(api.users.createProfile);

  const signIn = useCallback(
    async (email: string, password: string) => {
      await convexSignIn("password", { email, password, flow: "signIn" });
    },
    [convexSignIn]
  );

  const signUp = useCallback(
    async (email: string, password: string, fullName: string) => {
      await convexSignIn("password", { email, password, flow: "signUp" });
      // Create the user profile after signup
      await createProfile({ email, fullName });
    },
    [convexSignIn, createProfile]
  );

  const signOut = useCallback(async () => {
    await convexSignOut();
  }, [convexSignOut]);

  const user: User | null = userProfile
    ? {
        _id: userProfile._id,
        email: userProfile.email,
        fullName: userProfile.fullName,
        avatarUrl: userProfile.avatarUrl,
        currency: userProfile.currency,
        dateFormat: userProfile.dateFormat,
        hasSeenWelcomeTour: userProfile.hasSeenWelcomeTour,
        householdId: userProfile.householdId,
      }
    : null;

  return (
    <AuthContext.Provider
      value={{
        user,
        loading: isLoading,
        isAuthenticated,
        signIn,
        signUp,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
