"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import { useToast } from "@/contexts/ToastContext";
import NavBar from "@/components/NavBar";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  MotionCard,
} from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import Icon from "@/components/icons/Icon";
import Image from "next/image";
import { format } from "date-fns";
import { motion } from "motion/react";

interface HouseholdMember {
  user_id: string;
  role: string;
  joined_at: string;
  profiles: {
    full_name: string;
    email: string;
  };
}

interface Household {
  id: string;
  name: string;
  created_at: string;
}

export default function HouseholdPage() {
  const { user } = useAuth();
  const router = useRouter();
  const { success: showSuccess, error: showError } = useToast();
  const [loading, setLoading] = useState(true);
  const [household, setHousehold] = useState<Household | null>(null);
  const [members, setMembers] = useState<HouseholdMember[]>([]);
  const [currentUserRole, setCurrentUserRole] = useState<string>("");

  useEffect(() => {
    if (user) {
      fetchHouseholdData();
    }
  }, [user]);

  const fetchHouseholdData = async () => {
    try {
      const supabase = createClient();

      // Get user's household membership
      const { data: membership, error: membershipError } = await supabase
        .from("household_members")
        .select("household_id, role")
        .eq("user_id", user!.id)
        .single();

      if (membershipError || !membership) {
        // User is not in a household
        setLoading(false);
        return;
      }

      setCurrentUserRole(membership.role);

      // Fetch household details
      const { data: householdData, error: householdError } = await supabase
        .from("households")
        .select("*")
        .eq("id", membership.household_id)
        .single();

      if (householdError) throw householdError;
      setHousehold(householdData);

      // Fetch all household members
      const { data: membersData, error: membersError } = await supabase
        .from("household_members")
        .select(
          `
          user_id,
          role,
          joined_at,
          profiles:user_id (
            full_name,
            email
          )
        `,
        )
        .eq("household_id", membership.household_id)
        .order("joined_at", { ascending: true });

      if (membersError) throw membersError;

      // Transform the data to match the expected type
      const transformedMembers =
        membersData?.map((member: any) => ({
          user_id: member.user_id,
          role: member.role,
          joined_at: member.joined_at,
          profiles: Array.isArray(member.profiles)
            ? member.profiles[0]
            : member.profiles,
        })) || [];

      setMembers(transformedMembers);
    } catch (error) {
      console.error("Error fetching household:", error);
      showError("Failed to load household data");
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveMember = async (userId: string) => {
    if (!household || currentUserRole !== "owner") return;

    if (
      !confirm(
        "Are you sure you want to remove this member from the household?",
      )
    ) {
      return;
    }

    try {
      const supabase = createClient();
      const { error } = await supabase
        .from("household_members")
        .delete()
        .eq("household_id", household.id)
        .eq("user_id", userId);

      if (error) throw error;

      showSuccess("Member removed successfully");
      fetchHouseholdData();
    } catch (error) {
      console.error("Error removing member:", error);
      showError("Failed to remove member");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <NavBar />
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="animate-pulse space-y-6">
            <div className="h-32 bg-sand rounded-3xl" />
            <div className="h-64 bg-sand rounded-3xl" />
          </div>
        </div>
      </div>
    );
  }

  if (!household) {
    return (
      <div className="min-h-screen bg-background">
        <NavBar />

        {/* Hero Header */}
        <div className="bg-gradient-to-br from-primary-pale via-cream to-growth-pale">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center gap-4"
            >
              <div className="p-4 bg-surface rounded-2xl shadow-sm">
                <span className="text-4xl">👨‍👩‍👧‍👦</span>
              </div>
              <div>
                <h1 className="text-3xl font-display font-bold text-foreground">
                  Garden Partners
                </h1>
                <p className="text-text-secondary">
                  Grow your finances together
                </p>
              </div>
            </motion.div>
          </div>
        </div>

        <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <EmptyState
            illustration="piggy"
            title="No household yet"
            description="You're not part of a household yet. Get invited by a partner to start managing finances together!"
            action={{
              label: "Back to Dashboard",
              onClick: () => router.push("/dashboard"),
              variant: "secondary",
            }}
          />
        </main>
      </div>
    );
  }

  const isOwner = currentUserRole === "owner";

  return (
    <div className="min-h-screen bg-background">
      <NavBar />

      {/* Hero Header */}
      <div className="bg-gradient-to-br from-primary-pale via-cream to-growth-pale">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <button
              onClick={() => router.back()}
              className="text-text-secondary hover:text-foreground transition-colors mb-4 inline-flex items-center gap-2"
            >
              <Icon name="arrow_left" size={18} />
              Back
            </button>
            <div className="flex items-center gap-4">
              <div className="p-4 bg-surface rounded-2xl shadow-sm">
                <motion.span
                  className="text-4xl block"
                  animate={{ scale: [1, 1.1, 1] }}
                  transition={{ duration: 2, repeat: Infinity }}
                >
                  👨‍👩‍👧‍👦
                </motion.span>
              </div>
              <div>
                <h1 className="text-3xl font-display font-bold text-foreground">
                  {household.name}
                </h1>
                <p className="text-text-secondary">
                  Growing together since{" "}
                  {format(new Date(household.created_at), "MMMM yyyy")}
                </p>
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 -mt-6">
        <div className="space-y-6">
          {/* Household Stats */}
          <div className="grid grid-cols-2 gap-4">
            <MotionCard variant="glass" transition={{ delay: 0.1 }}>
              <CardContent className="p-5 text-center">
                <p className="text-sm text-text-secondary mb-1">
                  Garden Partners
                </p>
                <p className="text-3xl font-bold text-foreground font-mono">
                  {members.length}
                </p>
              </CardContent>
            </MotionCard>

            <MotionCard variant="glass" transition={{ delay: 0.15 }}>
              <CardContent className="p-5 text-center">
                <p className="text-sm text-text-secondary mb-1">Your Role</p>
                <p className="text-lg font-bold text-foreground capitalize flex items-center justify-center gap-2">
                  {isOwner && <span className="text-xl">👑</span>}
                  {currentUserRole}
                </p>
              </CardContent>
            </MotionCard>
          </div>

          {/* Members List */}
          <MotionCard transition={{ delay: 0.2 }}>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-growth-pale rounded-xl">
                  <Icon name="user" size={20} className="text-growth" />
                </div>
                <CardTitle>Members</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {members.map((member, index) => {
                  const profile = Array.isArray(member.profiles)
                    ? member.profiles[0]
                    : member.profiles;
                  const isCurrentUser = member.user_id === user!.id;
                  const memberIsOwner = member.role === "owner";

                  return (
                    <motion.div
                      key={member.user_id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className="flex items-center justify-between p-4 bg-sand/30 rounded-2xl group hover:bg-sand/50 transition-colors"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-full bg-primary-pale flex items-center justify-center">
                          {memberIsOwner ? (
                            <span className="text-2xl">👑</span>
                          ) : (
                            <Icon
                              name="user"
                              size={24}
                              className="text-primary"
                            />
                          )}
                        </div>
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-display font-bold text-foreground">
                              {profile?.full_name ||
                                profile?.email ||
                                "Unknown"}
                            </span>
                            {memberIsOwner && (
                              <span className="px-2 py-0.5 bg-primary/10 text-primary text-xs font-medium rounded-full">
                                Owner
                              </span>
                            )}
                            {isCurrentUser && (
                              <span className="px-2 py-0.5 bg-growth-pale text-growth text-xs font-medium rounded-full">
                                You
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-text-secondary">
                            {profile?.email}
                          </p>
                          <p className="text-xs text-text-secondary mt-1">
                            Joined{" "}
                            {format(new Date(member.joined_at), "MMM d, yyyy")}
                          </p>
                        </div>
                      </div>

                      {isOwner && !isCurrentUser && !memberIsOwner && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveMember(member.user_id)}
                          className="opacity-0 group-hover:opacity-100 transition-opacity text-expense hover:bg-expense/10"
                        >
                          <Icon name="trash" size={16} />
                          Remove
                        </Button>
                      )}
                    </motion.div>
                  );
                })}
              </div>
            </CardContent>
          </MotionCard>

          {/* Info Card */}
          {!isOwner && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              <Card className="bg-sand/30">
                <CardContent className="py-5">
                  <div className="flex items-start gap-3">
                    <Icon
                      name="memo"
                      size={20}
                      className="text-text-secondary mt-0.5"
                    />
                    <div>
                      <p className="text-sm text-text-secondary">
                        You are a member of this household. Only the owner can
                        manage members and settings.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* Invite Link (Owner Only) */}
          {isOwner && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              <Card className="bg-primary-pale/50 border-primary/20">
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    <div className="p-3 bg-primary/10 rounded-2xl">
                      <Icon name="joint" size={24} className="text-primary" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-display font-bold text-foreground mb-2">
                        Invite a Partner
                      </h3>
                      <p className="text-sm text-text-secondary mb-4">
                        Share this link with someone to invite them to your
                        household garden.
                      </p>
                      <div className="flex gap-2">
                        <code className="flex-1 px-4 py-2 bg-surface rounded-xl text-sm font-mono text-foreground truncate">
                          {typeof window !== "undefined"
                            ? `${window.location.origin}/join?household=${household.id}`
                            : `/join?household=${household.id}`}
                        </code>
                        <Button
                          variant="secondary"
                          onClick={() => {
                            navigator.clipboard.writeText(
                              `${window.location.origin}/join?household=${household.id}`,
                            );
                            showSuccess("Link copied!");
                          }}
                        >
                          <Icon name="edit" size={16} />
                          Copy
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </div>
      </main>
    </div>
  );
}
