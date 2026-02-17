"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/contexts/ToastContext";
import NavBar from "@/components/NavBar";
import AccountsList from "@/components/AccountsList";
import AddAccountModal from "@/components/AddAccountModal";
import { Button } from "@/components/ui/Button";
import { MotionCard } from "@/components/ui/Card";
import { AmountDisplay } from "@/components/ui/AmountDisplay";
import Icon from "@/components/icons/Icon";
import Image from "next/image";
import { motion } from "motion/react";
import { useCurrency } from "@/hooks/useCurrency";

export default function AccountsPage() {
  const { user, loading: authLoading, isAuthenticated } = useAuth();
  const { currency } = useCurrency();
  const router = useRouter();
  const pathname = usePathname();
  const toast = useToast();
  const [showAddModal, setShowAddModal] = useState(false);

  // Fetch accounts using Convex - automatically reactive
  const accounts = useQuery(api.accounts.list);

  // Calculate stats from accounts
  const accountCount = accounts?.length ?? 0;
  const totalBalance = accounts
    ? accounts.reduce((sum, acc) => sum + (acc.balance || 0), 0)
    : null;

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push("/auth");
    }
  }, [isAuthenticated, authLoading, router]);

  if (authLoading || !isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
        >
          <Image src="/logo.png" alt="Loading" width={48} height={48} />
        </motion.div>
      </div>
    );
  }

  return (
    <div key={pathname} className="min-h-screen bg-background">
      <NavBar />

      {/* Hero Header */}
      <div className="bg-gradient-to-br from-primary-pale via-cream to-sand">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4"
          >
            <div>
              <div className="flex items-center gap-3 mb-2">
                <span className="text-3xl" aria-hidden="true">🏦</span>
                <h1 className="text-3xl font-display font-bold text-foreground">
                  Money Pots
                </h1>
              </div>
              <p className="text-text-secondary">
                Your financial jars, each nurturing different goals
              </p>
            </div>
            <Button onClick={() => setShowAddModal(true)} variant="bloom" pill>
              <Icon name="plus" size={18} />
              Add New Pot
            </Button>
          </motion.div>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Summary Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-8 -mt-16">
          <MotionCard
            variant="glass"
            transition={{ delay: 0.1 }}
          >
            <div className="flex items-center gap-4 h-full min-h-[64px]">
              <div className="w-12 h-12 flex items-center justify-center flex-shrink-0 bg-growth-pale rounded-2xl">
                <Icon name="wallet" size={24} className="text-growth" />
              </div>
              <div>
                <p className="text-sm text-text-secondary font-medium">
                  Total Balance
                </p>
                {totalBalance !== null ? (
                  <AmountDisplay
                    value={totalBalance}
                    currency={currency}
                    size="md"
                    variant={totalBalance >= 0 ? "income" : "expense"}
                  />
                ) : (
                  <span className="text-2xl font-bold text-text-secondary">
                    --
                  </span>
                )}
              </div>
            </div>
          </MotionCard>

          <MotionCard
            variant="glass"
            transition={{ delay: 0.2 }}
          >
            <div className="flex items-center gap-4 h-full min-h-[64px]">
              <div className="w-12 h-12 flex items-center justify-center flex-shrink-0 bg-primary-pale rounded-2xl">
                <Icon name="accounts" size={24} className="text-primary" />
              </div>
              <div>
                <p className="text-sm text-text-secondary font-medium">
                  Active Accounts
                </p>
                <p className="text-2xl font-bold text-foreground tabular-nums">
                  {accountCount}
                </p>
              </div>
            </div>
          </MotionCard>
        </div>

        {/* Accounts List */}
        <MotionCard transition={{ delay: 0.2 }}>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-display font-bold text-foreground flex items-center gap-2">
              <span>🫙</span>
              Your Pots
            </h2>
          </div>
          <AccountsList onAddClick={() => setShowAddModal(true)} />
        </MotionCard>

        {/* Floating Add Button (Mobile) */}
        <motion.div
          className="fixed bottom-6 right-6 md:hidden"
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.5, type: "spring" }}
        >
          <Button
            onClick={() => setShowAddModal(true)}
            variant="bloom"
            size="lg"
            className="w-14 h-14 rounded-full shadow-lg p-0"
          >
            <Icon name="plus" size={24} />
          </Button>
        </motion.div>
      </main>

      {showAddModal && (
        <AddAccountModal
          onClose={() => setShowAddModal(false)}
          onSuccess={() => {
            setShowAddModal(false);
            toast.success("New pot added to your collection!");
            // Convex auto-refreshes data
          }}
        />
      )}
    </div>
  );
}
