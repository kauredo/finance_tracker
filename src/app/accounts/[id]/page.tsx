"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { Id } from "../../../../convex/_generated/dataModel";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/contexts/ToastContext";
import NavBar from "@/components/NavBar";
import TransactionsList from "@/components/TransactionsList";
import EditAccountModal from "@/components/EditAccountModal";
import DeleteConfirmModal from "@/components/DeleteConfirmModal";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";
import Icon from "@/components/icons/Icon";
import { useCurrency } from "@/hooks/useCurrency";

export default function AccountDetailPage() {
  const { loading: authLoading, isAuthenticated } = useAuth();
  const { formatAmount } = useCurrency();
  const router = useRouter();
  const params = useParams();
  const toast = useToast();
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const accountId = params.id as Id<"accounts">;

  // Fetch account using Convex
  const account = useQuery(api.accounts.getById, { id: accountId });
  const deleteAccount = useMutation(api.accounts.remove);

  const loading = account === undefined;

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push("/auth");
    }
  }, [authLoading, isAuthenticated, router]);

  const handleDelete = async () => {
    setDeleteLoading(true);
    try {
      await deleteAccount({ id: accountId });

      toast.success("Account deleted successfully");
      router.push("/accounts");
    } catch (error) {
      console.error("Error deleting account:", error);
      toast.error("Failed to delete account");
      setDeleteLoading(false);
      setShowDeleteModal(false);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-background">
        <NavBar />
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
            <div>
              <Skeleton variant="text" className="w-48 h-10 mb-2" />
              <Skeleton variant="text" className="w-24 h-5" />
            </div>
            <div className="flex gap-2 sm:gap-3 w-full sm:w-auto">
              <Skeleton
                variant="rectangle"
                className="flex-1 sm:flex-none sm:w-24 h-10 rounded-md"
              />
              <Skeleton
                variant="rectangle"
                className="flex-1 sm:flex-none sm:w-24 h-10 rounded-md"
              />
            </div>
          </div>
          <Card className="mb-6">
            <CardContent className="p-6">
              <Skeleton variant="text" className="w-32 h-4 mb-2" />
              <Skeleton variant="text" className="w-48 h-8" />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <Skeleton variant="text" className="w-40 h-7" />
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <Skeleton
                    key={i}
                    variant="rectangle"
                    className="w-full h-16 rounded-lg"
                  />
                ))}
              </div>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  if (!account) return null;

  return (
    <div className="min-h-screen bg-background">
      <NavBar />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-primary/10 rounded-xl">
              <Icon
                name={account.type === "personal" ? "personal" : "joint"}
                size={32}
                className="text-primary"
              />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-foreground">
                {account.name}
              </h1>
              <p className="text-muted capitalize">{account.type} Account</p>
            </div>
          </div>
          <div className="flex gap-2 sm:gap-3 w-full sm:w-auto">
            <Button
              variant="secondary"
              onClick={() => setShowEditModal(true)}
              className="flex-1 sm:flex-none"
            >
              <span className="hidden sm:inline">Edit Account</span>
              <span className="sm:hidden">Edit</span>
            </Button>
            <Button
              variant="danger"
              onClick={() => setShowDeleteModal(true)}
              className="flex-1 sm:flex-none"
            >
              <span className="hidden sm:inline">Delete Account</span>
              <span className="sm:hidden">Delete</span>
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardContent className="pt-6">
              <div className="text-sm text-muted mb-1">Current Balance</div>
              <div
                className={`text-3xl font-bold ${(account.balance ?? 0) >= 0 ? "text-success" : "text-danger"}`}
              >
                {formatAmount(account.balance ?? 0)}
              </div>
              {account.startingBalance != null &&
                account.startingBalance !== 0 && (
                  <p className="text-xs text-muted mt-2">
                    Starting balance: {formatAmount(account.startingBalance)}
                    {account.startingBalanceDate &&
                      ` as of ${new Date(account.startingBalanceDate + "T00:00:00").toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}`}
                  </p>
                )}
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Transactions</CardTitle>
          </CardHeader>
          <CardContent>
            <TransactionsList accountFilter={accountId} />
          </CardContent>
        </Card>
      </main>

      {showEditModal && account && (
        <EditAccountModal
          account={{
            _id: account._id,
            name: account.name,
            type: account.type,
            startingBalance: account.startingBalance,
            startingBalanceDate: account.startingBalanceDate,
          }}
          onClose={() => setShowEditModal(false)}
          onSuccess={() => {
            setShowEditModal(false);
            toast.success("Account updated successfully");
            // Convex auto-refreshes data
          }}
        />
      )}

      {showDeleteModal && (
        <DeleteConfirmModal
          title="Delete Account"
          message="Are you sure you want to delete this account? This will also delete all associated transactions."
          itemName={account.name}
          confirmText="Delete Account"
          onConfirm={handleDelete}
          onCancel={() => setShowDeleteModal(false)}
          isLoading={deleteLoading}
        />
      )}
    </div>
  );
}
