"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { createClient } from "@/utils/supabase/client";
import TransactionDetailModal from "@/components/TransactionDetailModal";
import { EmptyState } from "@/components/ui/EmptyState";
import { Card } from "@/components/ui/Card";
import Icon from "@/components/icons/Icon";
import { SkeletonTable } from "@/components/ui/Skeleton";
import { Pagination } from "@/components/ui/Pagination";
import { format, isToday, isYesterday, isThisWeek } from "date-fns";
import { motion } from "motion/react";

interface Transaction {
  id: string;
  date: string;
  description: string;
  amount: number;
  category: {
    name: string;
    color: string;
    icon: string;
  } | null;
  account: {
    name: string;
  };
  notes?: string | null;
}

interface TransactionsListProps {
  searchQuery?: string;
  accountFilter?: string;
  categoryFilter?: string;
  startDate?: string;
  endDate?: string;
  limit?: number;
}

// Group transactions by date
function groupTransactionsByDate(transactions: Transaction[]) {
  const groups: { [key: string]: Transaction[] } = {};

  transactions.forEach((t) => {
    const date = new Date(t.date);
    let label: string;

    if (isToday(date)) {
      label = "Today";
    } else if (isYesterday(date)) {
      label = "Yesterday";
    } else if (isThisWeek(date)) {
      label = format(date, "EEEE");
    } else {
      label = format(date, "MMMM d, yyyy");
    }

    if (!groups[label]) {
      groups[label] = [];
    }
    groups[label].push(t);
  });

  return groups;
}

export default function TransactionsList({
  searchQuery = "",
  accountFilter = "all",
  categoryFilter = "all",
  startDate,
  endDate,
  limit = 100,
}: TransactionsListProps = {}) {
  const { user } = useAuth();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTransactionId, setSelectedTransactionId] = useState<
    string | null
  >(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [totalCount, setTotalCount] = useState(0);

  useEffect(() => {
    if (user) {
      setCurrentPage(1);
      fetchTransactions();
    }
  }, [user, searchQuery, accountFilter, categoryFilter, startDate, endDate]);

  useEffect(() => {
    if (user) {
      fetchTransactions();
    }
  }, [currentPage, itemsPerPage]);

  const fetchTransactions = async () => {
    try {
      const supabase = createClient();

      let countQuery = supabase
        .from("transactions")
        .select("*", { count: "exact", head: true });

      let query = supabase
        .from("transactions")
        .select(
          `
          id,
          date,
          description,
          amount,
          notes,
          category:categories(name,color,icon),
          account:accounts(name,id)
        `,
        )
        .order("date", { ascending: false });

      if (searchQuery) {
        query = query.ilike("description", `%${searchQuery}%`);
        countQuery = countQuery.ilike("description", `%${searchQuery}%`);
      }

      if (accountFilter && accountFilter !== "all") {
        query = query.eq("account_id", accountFilter);
        countQuery = countQuery.eq("account_id", accountFilter);
      }

      if (categoryFilter && categoryFilter !== "all") {
        query = query.eq("category_id", categoryFilter);
        countQuery = countQuery.eq("category_id", categoryFilter);
      }

      if (startDate) {
        query = query.gte("date", startDate);
        countQuery = countQuery.gte("date", startDate);
      }
      if (endDate) {
        query = query.lte("date", endDate);
        countQuery = countQuery.lte("date", endDate);
      }

      const from = (currentPage - 1) * itemsPerPage;
      const to = from + itemsPerPage - 1;
      query = query.range(from, to);

      const [{ data, error }, { count }] = await Promise.all([
        query,
        countQuery,
      ]);

      if (error) throw error;

      const formattedData = (data || []).map((t: any) => ({
        ...t,
        account: Array.isArray(t.account) ? t.account[0] : t.account,
      })) as unknown as Transaction[];

      setTransactions(formattedData);
      setTotalCount(count || 0);
    } catch (error) {
      console.error("Error fetching transactions:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="space-y-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="animate-pulse">
              <div className="flex items-center gap-4 p-4 bg-sand/30 rounded-2xl">
                <div className="w-10 h-10 bg-sand rounded-full" />
                <div className="flex-1">
                  <div className="h-4 w-32 bg-sand rounded mb-2" />
                  <div className="h-3 w-24 bg-sand rounded" />
                </div>
                <div className="h-5 w-20 bg-sand rounded" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (transactions.length === 0) {
    return (
      <div className="p-6">
        <EmptyState
          illustration="search"
          title="No transactions found"
          description={
            searchQuery || accountFilter !== "all" || categoryFilter !== "all"
              ? "Try adjusting your filters to find what you're looking for."
              : "Add your first transaction or upload a bank statement to get started."
          }
        />
      </div>
    );
  }

  const groupedTransactions = groupTransactionsByDate(transactions);

  return (
    <div className="p-6">
      {/* Grouped Transactions */}
      <div className="space-y-6">
        {Object.entries(groupedTransactions).map(
          ([dateLabel, txs], groupIndex) => (
            <div key={dateLabel}>
              {/* Date Header */}
              <motion.div
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: groupIndex * 0.05 }}
                className="flex items-center gap-3 mb-3"
              >
                <span className="text-sm font-medium text-text-secondary">
                  {dateLabel}
                </span>
                <div className="flex-1 h-px bg-border" />
                <span className="text-xs text-text-secondary">
                  {txs.length} transaction{txs.length > 1 ? "s" : ""}
                </span>
              </motion.div>

              {/* Transaction Cards */}
              <div className="space-y-2">
                {txs.map((t, index) => (
                  <motion.div
                    key={t.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{
                      delay: (groupIndex * txs.length + index) * 0.02,
                    }}
                  >
                    <div
                      onClick={() => setSelectedTransactionId(t.id)}
                      className="group flex items-center gap-4 p-4 rounded-2xl bg-surface hover:bg-sand/50 border border-transparent hover:border-border transition-all cursor-pointer"
                    >
                      {/* Category Icon */}
                      <div
                        className="w-11 h-11 rounded-xl flex items-center justify-center transition-transform group-hover:scale-110"
                        style={{
                          backgroundColor: `${t.category?.color || "#888"}15`,
                          color: t.category?.color || "#888",
                        }}
                      >
                        <Icon
                          name={(t.category?.icon as any) || "other"}
                          size={20}
                        />
                      </div>

                      {/* Main Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="font-medium text-foreground truncate">
                            {t.description}
                          </h3>
                        </div>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-xs text-text-secondary">
                            {t.category?.name || "Uncategorized"}
                          </span>
                          <span className="text-text-secondary">•</span>
                          <span className="text-xs text-text-secondary">
                            {t.account?.name || "Unknown"}
                          </span>
                          {t.notes && (
                            <>
                              <span className="text-text-secondary">•</span>
                              <Icon
                                name="memo"
                                size={12}
                                className="text-text-secondary"
                              />
                            </>
                          )}
                        </div>
                      </div>

                      {/* Amount */}
                      <div className="text-right">
                        <span
                          className={`font-mono font-bold ${
                            t.amount > 0 ? "text-growth" : "text-foreground"
                          }`}
                        >
                          {t.amount > 0 ? "+" : ""}€
                          {Math.abs(t.amount).toLocaleString("de-DE", {
                            minimumFractionDigits: 2,
                          })}
                        </span>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          ),
        )}
      </div>

      {/* Pagination */}
      <div className="mt-6 pt-6 border-t border-border">
        <Pagination
          currentPage={currentPage}
          totalPages={Math.ceil(totalCount / itemsPerPage)}
          totalItems={totalCount}
          itemsPerPage={itemsPerPage}
          onPageChange={setCurrentPage}
          onItemsPerPageChange={(newItemsPerPage) => {
            setItemsPerPage(newItemsPerPage);
            setCurrentPage(1);
          }}
        />
      </div>

      {/* Transaction Detail Modal */}
      {selectedTransactionId && (
        <TransactionDetailModal
          transactionId={selectedTransactionId!}
          onClose={() => setSelectedTransactionId(null)}
          onUpdate={() => {
            setSelectedTransactionId(null);
            fetchTransactions();
          }}
        />
      )}
    </div>
  );
}
