"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
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
import { Badge } from "@/components/ui/Badge";
import { Avatar } from "@/components/ui/Avatar";
import { format } from "date-fns";
import { motion } from "motion/react";

export default function HouseholdPage() {
  const { user, loading: authLoading, isAuthenticated } = useAuth();
  const router = useRouter();
  const { success: showSuccess, error: showError } = useToast();

  // Fetch household using Convex
  const householdData = useQuery(api.households.getCurrentHousehold);
  const removeMemberMutation = useMutation(api.households.removeMember);
  const createInvite = useMutation(api.households.createInvite);
  const pendingInvites = useQuery(api.households.listPendingInvites);
  const revokeInvite = useMutation(api.households.revokeInvite);

  const loading = householdData === undefined;
  const household = householdData;
  const members = householdData?.members ?? [];

  // Find current user's role
  const currentUserMembership = members.find((m) => m.userId === user?._id);
  const currentUserRole = currentUserMembership?.role ?? "";

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push("/auth");
    }
  }, [authLoading, isAuthenticated, router]);

  const [creatingInvite, setCreatingInvite] = useState(false);

  const handleCreateInvite = async () => {
    setCreatingInvite(true);
    try {
      await createInvite({});
      showSuccess("Invite code created!");
    } catch (error) {
      console.error("Error creating invite:", error);
      showError("Failed to create invite");
    } finally {
      setCreatingInvite(false);
    }
  };

  const handleRevokeInvite = async (inviteId: Id<"householdInvites">) => {
    try {
      await revokeInvite({ inviteId });
      showSuccess("Invite revoked");
    } catch (error) {
      console.error("Error revoking invite:", error);
      showError("Failed to revoke invite");
    }
  };

  const handleRemoveMember = async (userId: Id<"users">) => {
    if (!household || currentUserRole !== "owner") return;

    if (
      !confirm(
        "Are you sure you want to remove this member from the household?",
      )
    ) {
      return;
    }

    try {
      await removeMemberMutation({
        householdId: household._id,
        userId,
      });

      showSuccess("Member removed successfully");
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
                  {format(new Date(household.createdAt), "MMMM yyyy")}
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
                <p className="text-3xl font-bold text-foreground tabular-nums">
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
                  const memberUser = member.user;
                  const isCurrentUser = member.userId === user?._id;
                  const memberIsOwner = member.role === "owner";

                  return (
                    <motion.div
                      key={member.userId}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className="flex items-center justify-between p-4 bg-sand/30 rounded-2xl group hover:bg-sand/50 transition-colors"
                    >
                      <div className="flex items-center gap-4">
                        <Avatar
                          name={
                            memberUser?.fullName || memberUser?.email || "?"
                          }
                          size="md"
                          status={memberIsOwner ? "online" : undefined}
                        />
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-display font-bold text-foreground">
                              {memberUser?.fullName ||
                                memberUser?.email ||
                                "Unknown"}
                            </span>
                            {memberIsOwner && (
                              <Badge variant="primary" size="sm" pill>
                                Owner
                              </Badge>
                            )}
                            {isCurrentUser && (
                              <Badge variant="growth" size="sm" pill>
                                You
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-text-secondary">
                            {memberUser?.email}
                          </p>
                          <p className="text-xs text-text-secondary mt-1">
                            Joined{" "}
                            {format(new Date(member.joinedAt), "MMM d, yyyy")}
                          </p>
                        </div>
                      </div>

                      {isOwner && !isCurrentUser && !memberIsOwner && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveMember(member.userId)}
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

          {/* Pending Invites (Owner Only) */}
          {isOwner && (
            <MotionCard transition={{ delay: 0.25 }}>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-primary-pale rounded-xl">
                    <Icon name="user_plus" size={20} className="text-primary" />
                  </div>
                  <CardTitle>Pending Invites</CardTitle>
                  {pendingInvites && pendingInvites.length > 0 && (
                    <Badge variant="default" pill className="ml-auto">
                      {pendingInvites.length}
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {pendingInvites && pendingInvites.length > 0 ? (
                  <div className="space-y-3">
                    {pendingInvites.map((invite) => {
                      const daysLeft = Math.max(
                        0,
                        Math.ceil(
                          (invite.expiresAt - Date.now()) /
                            (1000 * 60 * 60 * 24),
                        ),
                      );
                      const inviteLink =
                        typeof window !== "undefined"
                          ? `${window.location.origin}/join?code=${invite.inviteCode}`
                          : `/join?code=${invite.inviteCode}`;
                      return (
                        <div
                          key={invite._id}
                          className="p-4 bg-sand/30 rounded-2xl space-y-3"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <code className="text-sm font-mono font-bold text-foreground">
                                {invite.inviteCode}
                              </code>
                              <Badge
                                variant={daysLeft <= 1 ? "danger" : "default"}
                                size="sm"
                                pill
                              >
                                {daysLeft}d left
                              </Badge>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() =>
                                handleRevokeInvite(
                                  invite._id as Id<"householdInvites">,
                                )
                              }
                              className="text-expense hover:bg-expense/10"
                            >
                              Revoke
                            </Button>
                          </div>
                          <div className="flex gap-2">
                            <code className="w-0 flex-1 px-3 py-1.5 bg-surface rounded-lg text-xs font-mono text-text-secondary truncate">
                              {inviteLink}
                            </code>
                            <Button
                              variant="secondary"
                              size="sm"
                              onClick={() => {
                                navigator.clipboard.writeText(inviteLink);
                                showSuccess("Invite link copied!");
                              }}
                            >
                              <Icon name="edit" size={14} />
                              Copy
                            </Button>
                          </div>
                          <p className="text-xs text-text-secondary">
                            Created{" "}
                            {format(
                              new Date(invite.createdAt),
                              "MMM d, yyyy",
                            )}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-sm text-text-secondary text-center py-2">
                    No pending invites
                  </p>
                )}
                <div className="pt-3 border-t border-border/50">
                  <Button
                    variant="secondary"
                    onClick={handleCreateInvite}
                    isLoading={creatingInvite}
                    disabled={creatingInvite}
                    className="w-full"
                  >
                    <Icon name="user_plus" size={16} />
                    Generate Invite Code
                  </Button>
                </div>
              </CardContent>
            </MotionCard>
          )}

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

        </div>
      </main>
    </div>
  );
}
