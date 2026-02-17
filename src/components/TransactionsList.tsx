"use client";

import { useState, useCallback } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/contexts/ToastContext";
import { useCurrency } from "@/hooks/useCurrency";
import { useDateFormat } from "@/hooks/useDateFormat";
import TransactionDetailModal from "@/components/TransactionDetailModal";
import { EmptyState } from "@/components/ui/EmptyState";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Input";
import Icon from "@/components/icons/Icon";
import { Pagination } from "@/components/ui/Pagination";
import DeleteConfirmModal from "@/components/DeleteConfirmModal";
import { format, isToday, isYesterday, isThisWeek } from "date-fns";
import { motion, AnimatePresence } from "motion/react";

interface Transaction {
  _id: Id<"transactions">;
  date: string;
  description: string;
  amount: number;
  isTransfer?: boolean;
  category: {
    _id: Id<"categories">;
    name: string;
    color?: string;
    icon?: string;
  } | null;
  account: {
    _id: Id<"accounts">;
    name: string;
  } | null;
  notes?: string;
}

interface TransactionsListProps {
  searchQuery?: string;
  accountFilter?: string;
  categoryFilter?: string;
  startDate?: string;
  endDate?: string;
  minAmount?: number;
  maxAmount?: number;
  limit?: number;
  showPagination?: boolean;
  onBatchModeChange?: (active: boolean) => void;
}

// Group transactions by date
function groupTransactionsByDate(
  transactions: Transaction[],
  longFormat: string,
) {
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
      label = format(date, longFormat);
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
  minAmount,
  maxAmount,
  showPagination = true,
  onBatchModeChange,
}: TransactionsListProps = {}) {
  const { isAuthenticated } = useAuth();
  const toast = useToast();
  const { formatAmount } = useCurrency();
  const { longFormat } = useDateFormat();
  const [selectedTransactionId, setSelectedTransactionId] =
    useState<Id<"transactions"> | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Batch mode state
  const [batchMode, setBatchMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<Id<"transactions">>>(
    new Set(),
  );
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);
  const [showBulkDeleteModal, setShowBulkDeleteModal] = useState(false);
  const [batchLoading, setBatchLoading] = useState(false);

  const bulkDelete = useMutation(api.transactions.bulkDelete);
  const bulkUpdateCategory = useMutation(api.transactions.bulkUpdateCategory);
  const categories = useQuery(api.categories.list);

  const toggleSelect = useCallback((id: Id<"transactions">) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const enterBatchMode = useCallback(() => {
    setBatchMode(true);
    onBatchModeChange?.(true);
  }, [onBatchModeChange]);

  const exitBatchMode = useCallback(() => {
    setBatchMode(false);
    setSelectedIds(new Set());
    setShowCategoryPicker(false);
    onBatchModeChange?.(false);
  }, [onBatchModeChange]);

  // Build query args
  const queryArgs = {
    accountId:
      accountFilter && accountFilter !== "all"
        ? (accountFilter as Id<"accounts">)
        : undefined,
    categoryId:
      categoryFilter && categoryFilter !== "all"
        ? (categoryFilter as Id<"categories">)
        : undefined,
    dateFrom: startDate || undefined,
    dateTo: endDate || undefined,
    search: searchQuery || undefined,
    minAmount: minAmount ?? undefined,
    maxAmount: maxAmount ?? undefined,
    limit: itemsPerPage,
    offset: (currentPage - 1) * itemsPerPage,
  };

  // Fetch transactions using Convex
  const result = useQuery(api.transactions.list, queryArgs);

  const loading = result === undefined;
  const transactions = (result?.transactions || []) as Transaction[];
  const totalCount = result?.total || 0;

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

  const groupedTransactions = groupTransactionsByDate(transactions, longFormat);

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;
    setBatchLoading(true);
    try {
      await bulkDelete({ ids: [...selectedIds] });
      toast.success(`${selectedIds.size} transaction${selectedIds.size > 1 ? "s" : ""} deleted`);
      exitBatchMode();
    } catch {
      toast.error("Failed to delete transactions");
    } finally {
      setBatchLoading(false);
      setShowBulkDeleteModal(false);
    }
  };

  const handleBulkCategorize = async (categoryId: string) => {
    if (selectedIds.size === 0 || !categoryId) return;
    setBatchLoading(true);
    try {
      await bulkUpdateCategory({
        ids: [...selectedIds],
        categoryId: categoryId as Id<"categories">,
      });
      toast.success(`${selectedIds.size} transaction${selectedIds.size > 1 ? "s" : ""} categorized`);
      exitBatchMode();
    } catch {
      toast.error("Failed to categorize transactions");
    } finally {
      setBatchLoading(false);
    }
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === transactions.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(transactions.map((t) => t._id)));
    }
  };

  return (
    <div className="p-6">
      {/* Batch Mode Toggle */}
      {showPagination && transactions.length > 0 && (
        <div className="flex items-center justify-end mb-4">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => (batchMode ? exitBatchMode() : enterBatchMode())}
          >
            <Icon name={batchMode ? "check" : "edit"} size={16} />
            {batchMode ? "Done" : "Select"}
          </Button>
        </div>
      )}

      {/* Select All (in batch mode) */}
      {batchMode && (
        <div className="flex items-center gap-3 mb-4 px-1">
          <button
            role="checkbox"
            aria-checked={selectedIds.size === transactions.length}
            aria-label="Select all transactions"
            onClick={toggleSelectAll}
            className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
              selectedIds.size === transactions.length
                ? "bg-primary border-primary"
                : "border-border hover:border-primary/50"
            }`}
          >
            {selectedIds.size === transactions.length && (
              <Icon name="check" size={12} className="text-white" />
            )}
          </button>
          <span className="text-sm text-text-secondary">
            {selectedIds.size > 0
              ? `${selectedIds.size} of ${transactions.length} selected`
              : "Select all"}
          </span>
        </div>
      )}

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
                {txs.map((t, index) => {
                  const isSelected = selectedIds.has(t._id);
                  return (
                    <motion.div
                      key={t._id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{
                        delay: (groupIndex * txs.length + index) * 0.02,
                      }}
                    >
                      <div
                        onClick={() =>
                          batchMode
                            ? toggleSelect(t._id)
                            : setSelectedTransactionId(t._id)
                        }
                        className={`group flex items-center gap-4 p-4 rounded-2xl bg-surface hover:bg-sand/50 border transition-all cursor-pointer ${
                          isSelected
                            ? "border-primary/40 bg-primary-pale/30"
                            : "border-transparent hover:border-border"
                        }`}
                      >
                        {/* Checkbox (batch mode) */}
                        {batchMode && (
                          <button
                            role="checkbox"
                            aria-checked={isSelected}
                            aria-label={`Select ${t.description}`}
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleSelect(t._id);
                            }}
                            className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                              isSelected
                                ? "bg-primary border-primary"
                                : "border-border hover:border-primary/50"
                            }`}
                          >
                            {isSelected && (
                              <Icon name="check" size={12} className="text-white" />
                            )}
                          </button>
                        )}

                        {/* Category Icon */}
                        <div
                          className="w-11 h-11 rounded-xl flex items-center justify-center transition-transform group-hover:scale-110 flex-shrink-0"
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
                            {t.isTransfer && (
                              <>
                                <span className="text-text-secondary">•</span>
                                <span className="inline-flex items-center gap-0.5 text-xs text-text-secondary">
                                  <Icon name="transfer" size={11} />
                                  Transfer
                                </span>
                              </>
                            )}
                          </div>
                          {/* Notes preview */}
                          {t.notes && (
                            <p className="text-xs text-text-secondary mt-1 truncate max-w-sm">
                              {t.notes}
                            </p>
                          )}
                        </div>

                        {/* Amount */}
                        <div className="text-right">
                          <span
                            className={`font-bold tabular-nums ${
                              t.amount > 0 ? "text-growth" : "text-foreground"
                            }`}
                          >
                            {t.amount > 0 ? "+" : ""}
                            {formatAmount(Math.abs(t.amount))}
                          </span>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          ),
        )}
      </div>

      {/* Batch Action Bar */}
      <AnimatePresence>
        {batchMode && selectedIds.size > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 bg-surface border border-border shadow-lg rounded-2xl px-5 py-3 flex items-center gap-3"
          >
            <span className="text-sm font-medium text-foreground">
              {selectedIds.size} selected
            </span>
            <div className="w-px h-6 bg-border" />
            {showCategoryPicker ? (
              <Select
                value=""
                onChange={(e) => {
                  if (e.target.value) handleBulkCategorize(e.target.value);
                }}
                className="w-40 text-sm"
              >
                <option value="">Pick category...</option>
                {categories?.map((c) => (
                  <option key={c._id} value={c._id}>
                    {c.name}
                  </option>
                ))}
              </Select>
            ) : (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowCategoryPicker(true)}
                disabled={batchLoading}
              >
                <Icon name="tag" size={16} />
                Categorize
              </Button>
            )}
            <Button
              variant="danger"
              size="sm"
              onClick={() => setShowBulkDeleteModal(true)}
              disabled={batchLoading}
            >
              <Icon name="delete" size={16} />
              Delete
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bulk Delete Confirmation */}
      {showBulkDeleteModal && (
        <DeleteConfirmModal
          title="Delete Transactions"
          message={`Are you sure you want to delete ${selectedIds.size} transaction${selectedIds.size > 1 ? "s" : ""}?`}
          isLoading={batchLoading}
          onConfirm={handleBulkDelete}
          onCancel={() => setShowBulkDeleteModal(false)}
        />
      )}

      {/* Pagination */}
      {showPagination && (
        <div className={`mt-6 pt-6 border-t border-border ${batchMode && selectedIds.size > 0 ? "pb-20" : ""}`}>
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
      )}

      {/* Transaction Detail Modal */}
      {selectedTransactionId && (
        <TransactionDetailModal
          transactionId={selectedTransactionId}
          onClose={() => setSelectedTransactionId(null)}
          onUpdate={() => {
            setSelectedTransactionId(null);
            // With Convex, data refetches automatically!
          }}
        />
      )}
    </div>
  );
}
