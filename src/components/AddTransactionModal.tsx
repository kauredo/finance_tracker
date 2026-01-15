"use client";

import { useState, useEffect } from "react";
import { useToast } from "@/contexts/ToastContext";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { createClient } from "@/utils/supabase/client";
import Icon from "@/components/icons/Icon";

interface AddTransactionModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

interface Account {
  id: string;
  name: string;
  type: string;
}

interface Category {
  id: string;
  name: string;
  icon: string;
  color: string;
}

export default function AddTransactionModal({
  onClose,
  onSuccess,
}: AddTransactionModalProps) {
  const toast = useToast();
  const [loading, setLoading] = useState(false);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [_error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    account_id: "",
    date: new Date().toISOString().split("T")[0],
    description: "",
    amount: "",
    category_id: "",
    notes: "",
    transactionType: "expense", // expense or income
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        const supabase = createClient();
        const [accountsRes, categoriesRes] = await Promise.all([
          supabase.from("accounts").select("id, name, type").order("name"),
          supabase
            .from("categories")
            .select("id, name, icon, color")
            .order("name"),
        ]);

        if (accountsRes.error) throw accountsRes.error;
        if (categoriesRes.error) throw categoriesRes.error;

        setAccounts(accountsRes.data || []);
        setCategories(categoriesRes.data || []);

        // Auto-select first account if available
        if (accountsRes.data && accountsRes.data.length > 0) {
          setFormData((prev) => ({
            ...prev,
            account_id: accountsRes.data[0].id,
          }));
        }
      } catch (error: any) {
        console.error("Error fetching data:", error);
        toast.error("Failed to load accounts and categories");
      } finally {
        setLoadingData(false);
      }
    };

    fetchData();
  }, [toast]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null); // Clear previous errors

    if (!formData.account_id || !formData.description || !formData.amount) {
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

      const response = await fetch("/api/transactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          account_id: formData.account_id,
          date: formData.date,
          description: formData.description,
          amount: finalAmount,
          category_id: formData.category_id || null,
          notes: formData.notes || null,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to create transaction");
      }

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

  if (loadingData) {
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
              value={formData.account_id}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, account_id: e.target.value }))
              }
              className="w-full px-4 py-3 rounded-lg bg-surface border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
              required
            >
              <option value="">Select account</option>
              {accounts.map((account) => (
                <option key={account.id} value={account.id}>
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
              value={formData.category_id}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  category_id: e.target.value,
                }))
              }
              className="w-full px-4 py-3 rounded-lg bg-surface border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
            >
              <option value="">Uncategorized</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
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
