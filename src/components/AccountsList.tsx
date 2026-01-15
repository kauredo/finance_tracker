"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { createClient } from "@/utils/supabase/client";
import Link from "next/link";
import { EmptyState } from "@/components/ui/EmptyState";
import Icon from "@/components/icons/Icon";
import { motion } from "motion/react";

interface Account {
  id: string;
  name: string;
  type: "personal" | "joint";
  balance: number | null;
}

interface AccountsListProps {
  onRefresh?: () => void;
}

export default function AccountsList({
  onRefresh: _onRefresh,
}: AccountsListProps) {
  const { user } = useAuth();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchAccounts();
    }
  }, [user]);

  const fetchAccounts = async () => {
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("accounts")
        .select("id, name, type, balance")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setAccounts(data || []);
    } catch (error) {
      console.error("Error fetching accounts:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="animate-pulse">
            <div className="bg-sand/30 rounded-2xl p-5 h-32">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 bg-sand rounded-xl" />
                <div>
                  <div className="h-5 w-24 bg-sand rounded mb-2" />
                  <div className="h-3 w-16 bg-sand rounded" />
                </div>
              </div>
              <div className="h-6 w-28 bg-sand rounded" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (!accounts.length) {
    return (
      <EmptyState
        illustration="wallet"
        title="No pots yet"
        description="Add your first account to start tracking your finances."
      />
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {accounts.map((account, index) => (
        <motion.div
          key={account.id}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.05 }}
        >
          <Link href={`/accounts/${account.id}`}>
            <div className="group bg-surface hover:bg-sand/50 border border-border hover:border-primary/30 rounded-2xl p-5 transition-all cursor-pointer hover:shadow-md">
              <div className="flex items-center gap-3 mb-4">
                {/* Icon */}
                <div
                  className={`w-12 h-12 rounded-xl flex items-center justify-center transition-transform group-hover:scale-110 ${
                    account.type === "personal"
                      ? "bg-primary-pale text-primary"
                      : "bg-growth-pale text-growth"
                  }`}
                >
                  <Icon
                    name={account.type === "personal" ? "personal" : "joint"}
                    size={24}
                  />
                </div>

                <div className="flex-1 min-w-0">
                  <h4 className="font-display font-bold text-foreground group-hover:text-primary transition-colors truncate">
                    {account.name}
                  </h4>
                  <p className="text-xs text-text-secondary capitalize flex items-center gap-1">
                    {account.type === "joint" && <span>👥</span>}
                    {account.type} Account
                  </p>
                </div>
              </div>

              {/* Balance */}
              <div className="flex items-end justify-between">
                <div>
                  <p className="text-xs text-text-secondary mb-1">Balance</p>
                  <p
                    className={`text-xl font-bold font-mono ${
                      account.balance === null
                        ? "text-text-secondary"
                        : account.balance >= 0
                          ? "text-growth"
                          : "text-expense"
                    }`}
                  >
                    {account.balance !== null
                      ? `€${account.balance.toLocaleString("de-DE", {
                          minimumFractionDigits: 2,
                        })}`
                      : "—"}
                  </p>
                </div>

                {/* Arrow indicator */}
                <div className="p-2 rounded-full bg-sand/50 group-hover:bg-primary-pale transition-colors">
                  <Icon
                    name="chevron_down"
                    size={16}
                    className="text-text-secondary group-hover:text-primary -rotate-90 transition-colors"
                  />
                </div>
              </div>
            </div>
          </Link>
        </motion.div>
      ))}

      {/* Add Account Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: accounts.length * 0.05 }}
      >
        <Link href="#" onClick={(e) => e.preventDefault()}>
          <div className="group border-2 border-dashed border-border hover:border-primary/40 rounded-2xl p-5 h-full min-h-[140px] flex flex-col items-center justify-center gap-2 transition-all cursor-pointer hover:bg-primary-pale/20">
            <div className="w-12 h-12 rounded-xl bg-sand/50 group-hover:bg-primary-pale flex items-center justify-center transition-colors">
              <Icon
                name="plus"
                size={24}
                className="text-text-secondary group-hover:text-primary transition-colors"
              />
            </div>
            <p className="text-sm text-text-secondary group-hover:text-primary font-medium transition-colors">
              Add another pot
            </p>
          </div>
        </Link>
      </motion.div>
    </div>
  );
}
