"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/utils/supabase/client";
import { useToast } from "@/contexts/ToastContext";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import Icon from "@/components/icons/Icon";

interface RecurringTransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  editId?: string;
  initialData?: any;
}

interface Category {
  id: string;
  name: string;
  icon: string;
  color: string;
}

interface Account {
  id: string;
  name: string;
}

export default function RecurringTransactionModal({
  isOpen,
  onClose,
  onSuccess,
  editId,
  initialData,
}: RecurringTransactionModalProps) {
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [type, setType] = useState<"expense" | "income">("expense");
  const [categoryId, setCategoryId] = useState("");
  const [accountId, setAccountId] = useState("");
  const [interval, setInterval] = useState("monthly");
  const [nextRunDate, setNextRunDate] = useState(
    new Date().toISOString().split("T")[0],
  );

  const [categories, setCategories] = useState<Category[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);

  const { success, error } = useToast();
  const supabase = createClient();

  useEffect(() => {
    if (isOpen) {
      fetchData();
    } else {
      resetForm();
    }
  }, [isOpen, editId, initialData]);

  const fetchData = async () => {
    setFetching(true);
    try {
      // Fetch categories and accounts
      const [catRes, accRes] = await Promise.all([
        supabase.from("categories").select("*").order("name"),
        supabase.from("accounts").select("*").order("name"),
      ]);

      if (catRes.data) setCategories(catRes.data);
      if (accRes.data) setAccounts(accRes.data);

      // If editing, fetch existing data
      if (editId) {
        const { data: recurring } = await supabase
          .from("recurring_transactions")
          .select("*")
          .eq("id", editId)
          .single();

        if (recurring) {
          setDescription(recurring.description);
          setAmount(Math.abs(recurring.amount).toString());
          setType(recurring.amount >= 0 ? "income" : "expense");
          setCategoryId(recurring.category_id || "");
          setAccountId(recurring.account_id || "");
          setInterval(recurring.interval);
          setNextRunDate(recurring.next_run_date);
        }
      } else if (initialData) {
        // Pre-fill from suggestion
        setDescription(initialData.description);
        setAmount(Math.abs(initialData.amount).toString());
        setType(initialData.amount >= 0 ? "income" : "expense");
        setInterval(initialData.interval);
        // Default to today for next run
        setNextRunDate(new Date().toISOString().split("T")[0]);
      }
    } catch (err) {
      console.error("Error fetching data:", err);
      error("Failed to load data");
    } finally {
      setFetching(false);
    }
  };

  const resetForm = () => {
    setDescription("");
    setAmount("");
    setType("expense");
    setCategoryId("");
    setAccountId("");
    setInterval("monthly");
    setNextRunDate(new Date().toISOString().split("T")[0]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const finalAmount =
        type === "expense"
          ? -Math.abs(parseFloat(amount))
          : Math.abs(parseFloat(amount));
      const dateObj = new Date(nextRunDate);

      const payload = {
        description,
        amount: finalAmount,
        category_id: categoryId || null,
        account_id: accountId || null,
        interval,
        next_run_date: nextRunDate,
        day_of_month: dateObj.getDate(),
        day_of_week: dateObj.getDay(),
      };

      if (editId) {
        const res = await fetch(`/api/recurring/${editId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!res.ok) throw new Error("Failed to update");
        success("Recurring transaction updated");
      } else {
        const res = await fetch("/api/recurring", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!res.ok) throw new Error("Failed to create");
        success("Recurring transaction created");
      }

      onSuccess();
      onClose();
    } catch (err) {
      console.error("Error saving:", err);
      error("Failed to save recurring transaction");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-surface border border-border rounded-xl w-full max-w-md shadow-xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center p-6 border-b border-border">
          <h2 className="text-xl font-semibold text-foreground">
            {editId
              ? "Edit Recurring Transaction"
              : "New Recurring Transaction"}
          </h2>
          <Button
            onClick={onClose}
            variant="ghost"
            size="sm"
            className="text-muted hover:text-foreground"
          >
            <Icon name="close" size={20} />
          </Button>
        </div>

        {fetching ? (
          <div className="p-8 text-center text-muted">Loading...</div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            {/* Type Selection */}
            <div className="grid grid-cols-2 gap-2 p-1 bg-surface-alt rounded-lg">
              <Button
                type="button"
                onClick={() => setType("expense")}
                variant={type === "expense" ? "secondary" : "ghost"}
                className={
                  type === "expense" ? "text-danger shadow-sm" : "text-muted"
                }
              >
                Expense
              </Button>
              <Button
                type="button"
                onClick={() => setType("income")}
                variant={type === "income" ? "secondary" : "ghost"}
                className={
                  type === "income" ? "text-success shadow-sm" : "text-muted"
                }
              >
                Income
              </Button>
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-muted mb-1">
                Description
              </label>
              <Input
                type="text"
                required
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="e.g., Monthly Rent"
              />
            </div>

            {/* Amount */}
            <div>
              <label className="block text-sm font-medium text-muted mb-1">
                Amount
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted">
                  €
                </span>
                <Input
                  type="number"
                  required
                  step="0.01"
                  min="0"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="pl-8"
                  placeholder="0.00"
                />
              </div>
            </div>

            {/* Category */}
            <div>
              <label className="block text-sm font-medium text-muted mb-1">
                Category
              </label>
              <select
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className="w-full px-4 py-2 bg-surface border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-foreground appearance-none"
              >
                <option value="">Select Category</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Account */}
            <div>
              <label className="block text-sm font-medium text-muted mb-1">
                Account
              </label>
              <select
                required
                value={accountId}
                onChange={(e) => setAccountId(e.target.value)}
                className="w-full px-4 py-2 bg-surface border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-foreground appearance-none"
              >
                <option value="">Select Account</option>
                {accounts.map((acc) => (
                  <option key={acc.id} value={acc.id}>
                    {acc.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Interval & Date */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-muted mb-1">
                  Frequency
                </label>
                <select
                  required
                  value={interval}
                  onChange={(e) => setInterval(e.target.value)}
                  className="w-full px-4 py-2 bg-surface border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-foreground appearance-none"
                >
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                  <option value="yearly">Yearly</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-muted mb-1">
                  Next Due Date
                </label>
                <Input
                  type="date"
                  required
                  value={nextRunDate}
                  onChange={(e) => setNextRunDate(e.target.value)}
                />
              </div>
            </div>

            <div className="pt-4 flex gap-3">
              <Button
                type="button"
                variant="ghost"
                className="flex-1"
                onClick={onClose}
                disabled={loading}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                className="flex-1"
                disabled={loading}
              >
                {loading ? "Saving..." : "Save"}
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
