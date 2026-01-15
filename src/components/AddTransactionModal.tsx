"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import { useToast } from "@/contexts/ToastContext";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import Icon from "@/components/icons/Icon";

interface AddTransactionModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

export default function AddTransactionModal({
  onClose,
  onSuccess,
}: AddTransactionModalProps) {
  const toast = useToast();
  const [loading, setLoading] = useState(false);

  // Fetch accounts and categories using Convex queries
  const accounts = useQuery(api.accounts.list);
  const categories = useQuery(api.categories.list);

  // Mutation to create transaction
  const createTransaction = useMutation(api.transactions.create);

  const [formData, setFormData] = useState({
    accountId: "" as string,
    date: new Date().toISOString().split("T")[0],
    description: "",
    amount: "",
    categoryId: "" as string,
    notes: "",
    transactionType: "expense", // expense or income
  });

  // Auto-select first account when accounts load
  useEffect(() => {
    if (accounts && accounts.length > 0 && !formData.accountId) {
      setFormData((prev) => ({
        ...prev,
        accountId: accounts[0]._id,
      }));
    }
  }, [accounts, formData.accountId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    if (!formData.accountId || !formData.description || !formData.amount) {
      toast.warning("Please fill in all required fields");
      setLoading(false);
      return;
    }

    try {
      // Calculate final amount (negative for expenses, positive for income)
      const finalAmount =
        formData.transactionType === "expense"
          ? -Math.abs(parseFloat(formData.amount))
          : Math.abs(parseFloat(formData.amount));

      await createTransaction({
        accountId: formData.accountId as Id<"accounts">,
        date: formData.date,
        description: formData.description,
        amount: finalAmount,
        categoryId: formData.categoryId
          ? (formData.categoryId as Id<"categories">)
          : undefined,
        notes: formData.notes || undefined,
      });

      toast.success("Transaction created successfully!");
      onSuccess();
      onClose();
    } catch (error: any) {
      console.error("Error creating transaction:", error);
      toast.error(error.message || "Failed to create transaction");
    } finally {
      setLoading(false);
    }
  };

  // Loading state
  if (accounts === undefined || categories === undefined) {
    return (
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
        <Card variant="glass" className="w-full max-w-md">
          <div className="text-center py-8 text-muted">Loading...</div>
        </Card>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <Card
        variant="glass"
        className="w-full max-w-md max-h-[90vh] overflow-y-auto"
      >
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-foreground">
            Add Transaction
          </h2>
          <Button
            onClick={onClose}
            variant="ghost"
            size="sm"
            className="text-muted hover:text-foreground text-2xl"
          >
            ✕
          </Button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Transaction Type Toggle */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Transaction Type
            </label>
            <div className="grid grid-cols-2 gap-3">
              <Button
                type="button"
                onClick={() =>
                  setFormData((prev) => ({
                    ...prev,
                    transactionType: "expense",
                  }))
                }
                variant={
                  formData.transactionType === "expense"
                    ? "danger"
                    : "secondary"
                }
                className={
                  formData.transactionType === "expense" ? "shadow-lg" : ""
                }
              >
                <Icon name="expense" size={16} />
                Expense
              </Button>
              <Button
                type="button"
                onClick={() =>
                  setFormData((prev) => ({
                    ...prev,
                    transactionType: "income",
                  }))
                }
                variant={
                  formData.transactionType === "income"
                    ? "primary"
                    : "secondary"
                }
                className={
                  formData.transactionType === "income"
                    ? "bg-success hover:bg-success/90 shadow-lg"
                    : ""
                }
              >
                <Icon name="income" size={16} />
                Income
              </Button>
            </div>
          </div>

          {/* Account */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Account *
            </label>
            <select
              value={formData.accountId}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, accountId: e.target.value }))
              }
              className="w-full px-4 py-3 rounded-lg bg-surface border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
              required
            >
              <option value="">Select account</option>
              {accounts.map((account) => (
                <option key={account._id} value={account._id}>
                  {account.name} ({account.type})
                </option>
              ))}
            </select>
          </div>

          {/* Date */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Date *
            </label>
            <Input
              type="date"
              value={formData.date}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, date: e.target.value }))
              }
              required
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Description *
            </label>
            <Input
              type="text"
              value={formData.description}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  description: e.target.value,
                }))
              }
              placeholder="e.g., Grocery shopping, Salary"
              required
            />
          </div>

          {/* Amount */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Amount (€) *
            </label>
            <Input
              type="number"
              step="0.01"
              min="0"
              value={formData.amount}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, amount: e.target.value }))
              }
              placeholder="0.00"
              required
            />
          </div>

          {/* Category */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Category
            </label>
            <select
              value={formData.categoryId}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  categoryId: e.target.value,
                }))
              }
              className="w-full px-4 py-3 rounded-lg bg-surface border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
            >
              <option value="">Uncategorized</option>
              {categories.map((category) => (
                <option key={category._id} value={category._id}>
                  {category.name}
                </option>
              ))}
            </select>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Notes (Optional)
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, notes: e.target.value }))
              }
              placeholder="Add any additional details..."
              rows={3}
              className="w-full px-4 py-3 rounded-lg bg-surface border border-border text-foreground placeholder-muted focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
            />
          </div>

          {/* Submit */}
          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              onClick={onClose}
              variant="secondary"
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading}
              isLoading={loading}
              variant="primary"
              className="flex-1 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 shadow-lg hover:shadow-xl"
            >
              {loading ? "Creating..." : "Create Transaction"}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
