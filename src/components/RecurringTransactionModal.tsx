"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import { useToast } from "@/contexts/ToastContext";
import { Button } from "@/components/ui/Button";
import { Input, Select } from "@/components/ui/Input";
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalTitle,
  ModalBody,
  ModalFooter,
} from "@/components/ui/Modal";
import Icon from "@/components/icons/Icon";

interface RecurringTransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  editId?: Id<"recurringTransactions">;
  initialData?: {
    description: string;
    amount: number;
    interval: string;
  };
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
  const [interval, setInterval] = useState<
    "daily" | "weekly" | "monthly" | "yearly"
  >("monthly");
  const [nextRunDate, setNextRunDate] = useState(
    new Date().toISOString().split("T")[0],
  );
  const [loading, setLoading] = useState(false);

  const { success, error } = useToast();

  // Fetch categories and accounts from Convex
  const categories = useQuery(api.categories.list, isOpen ? {} : "skip");
  const accounts = useQuery(api.accounts.list, isOpen ? {} : "skip");
  const existingRecurring = useQuery(
    api.recurring.getById,
    isOpen && editId ? { id: editId } : "skip",
  );

  const createRecurring = useMutation(api.recurring.create);
  const updateRecurring = useMutation(api.recurring.update);

  const fetching =
    isOpen &&
    (categories === undefined ||
      accounts === undefined ||
      (editId && existingRecurring === undefined));

  // Initialize form when data loads
  useEffect(() => {
    if (isOpen && existingRecurring && editId) {
      setDescription(existingRecurring.description);
      setAmount(Math.abs(existingRecurring.amount).toString());
      setType(existingRecurring.amount >= 0 ? "income" : "expense");
      setCategoryId(existingRecurring.categoryId || "");
      setAccountId(existingRecurring.accountId || "");
      setInterval(existingRecurring.interval);
      setNextRunDate(existingRecurring.nextRunDate);
    } else if (isOpen && initialData && !editId) {
      // Pre-fill from suggestion
      setDescription(initialData.description);
      setAmount(Math.abs(initialData.amount).toString());
      setType(initialData.amount >= 0 ? "income" : "expense");
      setInterval(
        initialData.interval as "daily" | "weekly" | "monthly" | "yearly",
      );
      setNextRunDate(new Date().toISOString().split("T")[0]);
    } else if (!isOpen) {
      resetForm();
    }
  }, [isOpen, existingRecurring, editId, initialData]);

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

      if (editId) {
        await updateRecurring({
          id: editId,
          description,
          amount: finalAmount,
          categoryId: categoryId ? (categoryId as Id<"categories">) : undefined,
          accountId: accountId ? (accountId as Id<"accounts">) : undefined,
          interval,
          nextRunDate,
          dayOfMonth: dateObj.getDate(),
          dayOfWeek: dateObj.getDay(),
        });
        success("Recurring transaction updated");
      } else {
        await createRecurring({
          description,
          amount: finalAmount,
          categoryId: categoryId ? (categoryId as Id<"categories">) : undefined,
          accountId: accountId ? (accountId as Id<"accounts">) : undefined,
          interval,
          nextRunDate,
          dayOfMonth: dateObj.getDate(),
          dayOfWeek: dateObj.getDay(),
        });
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

  return (
    <Modal open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <ModalContent size="md">
        <ModalHeader>
          <ModalTitle>
            {editId
              ? "Edit Recurring Transaction"
              : "New Recurring Transaction"}
          </ModalTitle>
        </ModalHeader>

        {fetching ? (
          <ModalBody>
            <div className="text-center py-8 text-text-secondary">
              Loading...
            </div>
          </ModalBody>
        ) : (
          <form onSubmit={handleSubmit}>
            <ModalBody className="space-y-4 max-h-[60vh] overflow-y-auto">
              {/* Type Selection */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Transaction Type
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setType("expense")}
                    className={`flex items-center justify-center gap-2 px-4 py-3 rounded-xl border-2 font-medium transition-all ${
                      type === "expense"
                        ? "border-expense bg-expense text-white"
                        : "border-border bg-surface text-foreground hover:border-expense/50"
                    }`}
                  >
                    <Icon name="expense" size={16} />
                    Expense
                  </button>
                  <button
                    type="button"
                    onClick={() => setType("income")}
                    className={`flex items-center justify-center gap-2 px-4 py-3 rounded-xl border-2 font-medium transition-all ${
                      type === "income"
                        ? "border-growth bg-growth text-white"
                        : "border-border bg-surface text-foreground hover:border-growth/50"
                    }`}
                  >
                    <Icon name="income" size={16} />
                    Income
                  </button>
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Description *
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
                <label className="block text-sm font-medium text-foreground mb-2">
                  Amount (€) *
                </label>
                <Input
                  type="number"
                  required
                  step="0.01"
                  min="0"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                />
              </div>

              {/* Category */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Category
                </label>
                <Select
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                >
                  <option value="">Select Category</option>
                  {categories?.map((cat) => (
                    <option key={cat._id} value={cat._id}>
                      {cat.name}
                    </option>
                  ))}
                </Select>
              </div>

              {/* Account */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Account *
                </label>
                <Select
                  required
                  value={accountId}
                  onChange={(e) => setAccountId(e.target.value)}
                >
                  <option value="">Select Account</option>
                  {accounts?.map((acc) => (
                    <option key={acc._id} value={acc._id}>
                      {acc.name}
                    </option>
                  ))}
                </Select>
              </div>

              {/* Interval & Date */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Frequency *
                  </label>
                  <Select
                    required
                    value={interval}
                    onChange={(e) =>
                      setInterval(
                        e.target.value as
                          | "daily"
                          | "weekly"
                          | "monthly"
                          | "yearly",
                      )
                    }
                  >
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly</option>
                    <option value="monthly">Monthly</option>
                    <option value="yearly">Yearly</option>
                  </Select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Next Due Date *
                  </label>
                  <Input
                    type="date"
                    required
                    value={nextRunDate}
                    onChange={(e) => setNextRunDate(e.target.value)}
                  />
                </div>
              </div>
            </ModalBody>

            <ModalFooter>
              <Button
                type="button"
                variant="ghost"
                onClick={onClose}
                disabled={loading}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="bloom"
                disabled={loading}
                isLoading={loading}
              >
                Save
              </Button>
            </ModalFooter>
          </form>
        )}
      </ModalContent>
    </Modal>
  );
}
