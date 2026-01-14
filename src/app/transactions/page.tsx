"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/contexts/ToastContext";
import { createClient } from "@/utils/supabase/client";
import NavBar from "@/components/NavBar";
import TransactionsList from "@/components/TransactionsList";
import AddTransactionModal from "@/components/AddTransactionModal";
import DateRangePicker from "@/components/DateRangePicker";
import { useDateRange } from "@/hooks/useDateRange";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, MotionCard } from "@/components/ui/Card";
import { Input, Select } from "@/components/ui/Input";
import Icon, { IconName } from "@/components/icons/Icon";
import Image from "next/image";
import { motion, AnimatePresence } from "motion/react";

export default function TransactionsPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const toast = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedAccount, setSelectedAccount] = useState<string>("all");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [showAddModal, setShowAddModal] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const { dateRange, setDateRange, setPreset } = useDateRange("month");

  const [accounts, setAccounts] = useState<Array<{ id: string; name: string }>>(
    [],
  );
  const [categories, setCategories] = useState<
    Array<{ id: string; name: string; icon: string }>
  >([]);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/auth");
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (user) {
      const fetchFiltersData = async () => {
        const supabase = createClient();
        try {
          const [accountsRes, categoriesRes] = await Promise.all([
            supabase.from("accounts").select("id, name").order("name"),
            supabase.from("categories").select("id, name, icon").order("name"),
          ]);

          if (accountsRes.data) setAccounts(accountsRes.data);
          if (categoriesRes.data) setCategories(categoriesRes.data);
        } catch (error) {
          console.error("Error fetching filter data:", error);
        }
      };
      fetchFiltersData();
    }
  }, [user]);

  if (authLoading || !user) {
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

  const hasActiveFilters =
    searchQuery ||
    selectedAccount !== "all" ||
    selectedCategory !== "all" ||
    dateRange.startDate ||
    dateRange.endDate;

  const clearFilters = () => {
    setSearchQuery("");
    setSelectedAccount("all");
    setSelectedCategory("all");
    setPreset("all");
  };

  return (
    <div key={pathname} className="min-h-screen bg-background">
      <NavBar />

      {/* Hero Header */}
      <div className="bg-gradient-to-br from-cream via-surface to-sand">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4"
          >
            <div>
              <div className="flex items-center gap-3 mb-2">
                <span className="text-3xl">📋</span>
                <h1 className="text-3xl font-display font-bold text-foreground">
                  Transactions
                </h1>
              </div>
              <p className="text-text-secondary">
                Track every coin that flows through your garden
              </p>
            </div>
            <div className="flex gap-3">
              <Button
                variant="secondary"
                onClick={() => setShowFilters(!showFilters)}
                className={hasActiveFilters ? "ring-2 ring-primary/30" : ""}
              >
                <Icon name="search" size={18} />
                {hasActiveFilters ? "Filters Active" : "Filter"}
              </Button>
              <Button
                onClick={() => setShowAddModal(true)}
                variant="bloom"
                pill
              >
                <Icon name="plus" size={18} />
                Add Transaction
              </Button>
            </div>
          </motion.div>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Filters Section */}
        <AnimatePresence>
          {showFilters && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
              className="mb-6 overflow-hidden"
            >
              <Card className="bg-sand/30">
                <CardContent className="p-5">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-display font-bold text-foreground flex items-center gap-2">
                      <Icon name="search" size={18} />
                      Search & Filter
                    </h3>
                    {hasActiveFilters && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={clearFilters}
                        className="text-text-secondary hover:text-foreground"
                      >
                        Clear all
                      </Button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {/* Search */}
                    <div>
                      <Input
                        type="text"
                        placeholder="Search transactions..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        icon={<Icon name="search" size={18} />}
                      />
                    </div>

                    {/* Account Filter */}
                    <div>
                      <Select
                        value={selectedAccount}
                        onChange={(e) => setSelectedAccount(e.target.value)}
                      >
                        <option value="all">All Accounts</option>
                        {accounts.map((account) => (
                          <option key={account.id} value={account.id}>
                            {account.name}
                          </option>
                        ))}
                      </Select>
                    </div>

                    {/* Category Filter */}
                    <div>
                      <Select
                        value={selectedCategory}
                        onChange={(e) => setSelectedCategory(e.target.value)}
                      >
                        <option value="all">All Categories</option>
                        {categories.map((category) => (
                          <option key={category.id} value={category.id}>
                            {category.name}
                          </option>
                        ))}
                      </Select>
                    </div>

                    {/* Date Range */}
                    <div>
                      <Button
                        variant="secondary"
                        onClick={() => setShowDatePicker(!showDatePicker)}
                        className="w-full justify-start"
                      >
                        <Icon name="calendar" size={18} />
                        {dateRange.startDate ? "Custom Range" : "All Time"}
                      </Button>
                    </div>
                  </div>

                  {/* Date Range Picker */}
                  <AnimatePresence>
                    {showDatePicker && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        className="mt-4 pt-4 border-t border-border overflow-hidden"
                      >
                        <DateRangePicker
                          startDate={dateRange.startDate}
                          endDate={dateRange.endDate}
                          onChange={(start, end) =>
                            setDateRange({ startDate: start, endDate: end })
                          }
                          onPresetChange={setPreset}
                        />
                      </motion.div>
                    )}
                  </AnimatePresence>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Transaction List */}
        <MotionCard transition={{ delay: 0.1 }}>
          <TransactionsList
            searchQuery={searchQuery}
            accountFilter={selectedAccount}
            categoryFilter={selectedCategory}
            startDate={dateRange.startDate}
            endDate={dateRange.endDate}
          />
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

      {/* Add Transaction Modal */}
      {showAddModal && (
        <AddTransactionModal
          onClose={() => setShowAddModal(false)}
          onSuccess={() => {
            setShowAddModal(false);
            toast.success("Transaction added to your garden!");
          }}
        />
      )}
    </div>
  );
}
