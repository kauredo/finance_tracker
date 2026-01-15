"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { useRouter } from "next/navigation";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import Icon from "@/components/icons/Icon";
import { useToast } from "@/contexts/ToastContext";
import { motion } from "motion/react";

export default function AdminPage() {
  const router = useRouter();
  const toast = useToast();
  const [deletingUserId, setDeletingUserId] = useState<Id<"users"> | null>(
    null,
  );

  // Check if current user is admin
  const currentUser = useQuery(api.admin.getCurrentUserStatus);
  const users = useQuery(api.admin.listUsers);

  const confirmUser = useMutation(api.admin.confirmUser);
  const unconfirmUser = useMutation(api.admin.unconfirmUser);
  const setAdminStatus = useMutation(api.admin.setAdminStatus);
  const deleteUser = useMutation(api.admin.deleteUser);

  const loading = currentUser === undefined || users === undefined;

  // Redirect if not admin
  if (currentUser === null) {
    router.push("/auth");
    return null;
  }

  if (currentUser && !currentUser.isAdmin) {
    router.push("/dashboard");
    return null;
  }

  const handleConfirm = async (userId: Id<"users">) => {
    try {
      await confirmUser({ userId });
      toast.success("User confirmed");
    } catch (err: any) {
      toast.error(err.message || "Failed to confirm user");
    }
  };

  const handleUnconfirm = async (userId: Id<"users">) => {
    try {
      await unconfirmUser({ userId });
      toast.success("User unconfirmed");
    } catch (err: any) {
      toast.error(err.message || "Failed to unconfirm user");
    }
  };

  const handleToggleAdmin = async (userId: Id<"users">, isAdmin: boolean) => {
    try {
      await setAdminStatus({ userId, isAdmin: !isAdmin });
      toast.success(
        isAdmin ? "Admin privileges removed" : "Admin privileges granted",
      );
    } catch (err: any) {
      toast.error(err.message || "Failed to update admin status");
    }
  };

  const handleDelete = async (userId: Id<"users">) => {
    if (
      !confirm(
        "Are you sure you want to delete this user? This cannot be undone.",
      )
    ) {
      return;
    }

    setDeletingUserId(userId);
    try {
      await deleteUser({ userId });
      toast.success("User deleted");
    } catch (err: any) {
      toast.error(err.message || "Failed to delete user");
    } finally {
      setDeletingUserId(null);
    }
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="max-w-4xl mx-auto">
          <div className="animate-pulse space-y-4">
            <div className="h-8 w-48 bg-sand rounded-lg" />
            <div className="h-64 bg-sand rounded-2xl" />
          </div>
        </div>
      </div>
    );
  }

  const confirmedUsers = users?.filter((u) => u.isConfirmed) || [];
  const pendingUsers = users?.filter((u) => !u.isConfirmed) || [];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-surface border-b border-border sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.push("/dashboard")}
              >
                <Icon name="arrow_left" size={20} />
              </Button>
              <h1 className="text-xl font-display font-bold text-foreground">
                Admin Panel
              </h1>
            </div>
            <div className="text-sm text-text-secondary">
              {users?.length || 0} users total
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* Pending Users */}
        {pendingUsers.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-warning">
                <span className="text-xl">⏳</span>
                Pending Confirmation ({pendingUsers.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {pendingUsers.map((user, index) => (
                  <motion.div
                    key={user._id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="flex items-center justify-between p-4 rounded-xl bg-warning/5 border border-warning/20"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-warning/20 flex items-center justify-center">
                        <Icon name="user" size={20} className="text-warning" />
                      </div>
                      <div>
                        <p className="font-medium text-foreground">
                          {user.fullName || "No name"}
                        </p>
                        <p className="text-sm text-text-secondary">
                          {user.email}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-text-secondary mr-2">
                        Joined {formatDate(user.createdAt)}
                      </span>
                      <Button
                        variant="bloom"
                        size="sm"
                        onClick={() => handleConfirm(user._id)}
                      >
                        <Icon name="check" size={16} />
                        Confirm
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(user._id)}
                        disabled={deletingUserId === user._id}
                        className="text-danger hover:bg-danger/10"
                      >
                        <Icon name="trash" size={16} />
                      </Button>
                    </div>
                  </motion.div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Confirmed Users */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <span className="text-xl">✅</span>
              Confirmed Users ({confirmedUsers.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {confirmedUsers.length === 0 ? (
              <p className="text-text-secondary text-center py-8">
                No confirmed users yet
              </p>
            ) : (
              <div className="space-y-3">
                {confirmedUsers.map((user, index) => (
                  <motion.div
                    key={user._id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="flex items-center justify-between p-4 rounded-xl bg-sand/30 hover:bg-sand/50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-10 h-10 rounded-full flex items-center justify-center ${
                          user.isAdmin ? "bg-primary/20" : "bg-growth/20"
                        }`}
                      >
                        <Icon
                          name={user.isAdmin ? "settings" : "user"}
                          size={20}
                          className={
                            user.isAdmin ? "text-primary" : "text-growth"
                          }
                        />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-foreground">
                            {user.fullName || "No name"}
                          </p>
                          {user.isAdmin && (
                            <span className="px-2 py-0.5 text-xs rounded-full bg-primary/20 text-primary font-medium">
                              Admin
                            </span>
                          )}
                          {user._id === currentUser?._id && (
                            <span className="px-2 py-0.5 text-xs rounded-full bg-sand text-text-secondary">
                              You
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-text-secondary">
                          {user.email}
                        </p>
                      </div>
                    </div>
                    {user._id !== currentUser?._id && (
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            handleToggleAdmin(user._id, user.isAdmin)
                          }
                          title={user.isAdmin ? "Remove admin" : "Make admin"}
                        >
                          <Icon name="settings" size={16} />
                          {user.isAdmin ? "Remove Admin" : "Make Admin"}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleUnconfirm(user._id)}
                          className="text-warning hover:bg-warning/10"
                          disabled={user.isAdmin}
                          title={
                            user.isAdmin
                              ? "Cannot unconfirm admin"
                              : "Unconfirm user"
                          }
                        >
                          Unconfirm
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(user._id)}
                          disabled={deletingUserId === user._id || user.isAdmin}
                          className="text-danger hover:bg-danger/10"
                          title={
                            user.isAdmin ? "Cannot delete admin" : "Delete user"
                          }
                        >
                          <Icon name="trash" size={16} />
                        </Button>
                      </div>
                    )}
                  </motion.div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
