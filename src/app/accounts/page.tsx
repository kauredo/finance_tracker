"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/contexts/ToastContext";
import NavBar from "@/components/NavBar";
import AccountsList from "@/components/AccountsList";
import AddAccountModal from "@/components/AddAccountModal";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";

export default function AccountsPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const toast = useToast();
  const [showAddModal, setShowAddModal] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/auth");
    }
  }, [user, authLoading, router]);

  if (authLoading || !user) {
    return (
      <div className="min-h-screen bg-background">
        <NavBar />
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
            <div>
              <Skeleton variant="text" className="w-48 h-10 mb-2" />
              <Skeleton variant="text" className="w-64 h-5" />
            </div>
            <Skeleton variant="rectangle" className="w-32 h-10 rounded-md" />
          </div>
          <Card>
            <CardHeader>
              <Skeleton variant="text" className="w-40 h-7" />
            </CardHeader>
            <CardContent>
              <div className="grid gap-4">
                {[1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="bg-surface-alt/50 border border-border rounded-lg p-4"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Skeleton variant="circle" className="w-10 h-10" />
                        <div className="space-y-2">
                          <Skeleton variant="text" className="w-32 h-5" />
                          <Skeleton variant="text" className="w-24 h-4" />
                        </div>
                      </div>
                      <div className="text-right space-y-2">
                        <Skeleton variant="text" className="w-24 h-6" />
                        <Skeleton variant="text" className="w-20 h-3" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  return (
    <div key={pathname} className="min-h-screen bg-background">
      <NavBar />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Accounts</h1>
            <p className="text-muted mt-1">
              Manage your personal and joint accounts
            </p>
          </div>
          <Button onClick={() => setShowAddModal(true)}>+ Add Account</Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Your Accounts</CardTitle>
          </CardHeader>
          <CardContent>
            <AccountsList />
          </CardContent>
        </Card>
      </main>

      {showAddModal && (
        <AddAccountModal
          onClose={() => setShowAddModal(false)}
          onSuccess={() => {
            setShowAddModal(false);
            toast.success("Account created successfully!");
            // Refresh accounts list will happen automatically via useEffect in AccountsList
          }}
        />
      )}
    </div>
  );
}
