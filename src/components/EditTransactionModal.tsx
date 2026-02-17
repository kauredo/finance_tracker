"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import { useToast } from "@/contexts/ToastContext";
import { Button } from "@/components/ui/Button";
import { Input, Select, Textarea } from "@/components/ui/Input";
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalTitle,
  ModalBody,
  ModalFooter,
} from "@/components/ui/Modal";
import Icon from "@/components/icons/Icon";
import { useCurrency } from "@/hooks/useCurrency";

interface EditTransactionModalProps {
  transactionId: Id<"transactions">;
  onClose: () => void;
  onSuccess: () => void;
}

export default function EditTransactionModal({
  transactionId,
  onClose,
  onSuccess,
}: EditTransactionModalProps) {
  const toast = useToast();
  const { symbol } = useCurrency();
  const [loading, setLoading] = useState(false);

  // Fetch data using Convex
  const transaction = useQuery(api.transactions.getById, { id: transactionId });
  const accounts = useQuery(api.accounts.list);
  const categories = useQuery(api.categories.list);

  // Mutation to update transaction
  const updateTransaction = useMutation(api.transactions.update);

  const [formData, setFormData] = useState({
    accountId: "",
    date: "",
    description: "",
    amount: "",
    categoryId: "",
    notes: "",
    transactionType: "expense",
  });

  // Initialize form when transaction loads
  useEffect(() => {
    if (transaction) {
      setFormData({
        accountId: transaction.accountId || "",
        date: transaction.date,
        description: transaction.description,
        amount: Math.abs(transaction.amount).toString(),
        categoryId: transaction.categoryId || "",
        notes: transaction.notes || "",
        transactionType: transaction.amount < 0 ? "expense" : "income",
      });
    }
  }, [transaction]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const parsedAmount = parseFloat(formData.amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      toast.warning("Please enter a valid amount");
      setLoading(false);
      return;
    }

    try {
      const finalAmount =
        formData.transactionType === "expense"
          ? -Math.abs(parsedAmount)
          : Math.abs(parsedAmount);

      await updateTransaction({
        id: transactionId,
        accountId: formData.accountId as Id<"accounts">,
        date: formData.date,
        description: formData.description,
        amount: finalAmount,
        categoryId: formData.categoryId
          ? (formData.categoryId as Id<"categories">)
          : undefined,
        notes: formData.notes || undefined,
      });

      toast.success("Transaction updated successfully!");
      onSuccess();
      onClose();
    } catch (error: any) {
      console.error("Error updating transaction:", error);
      toast.error(error.message || "Failed to update transaction");
    } finally {
      setLoading(false);
    }
  };

  const loadingData =
    transaction === undefined ||
    accounts === undefined ||
    categories === undefined;

  if (loadingData) {
    return (
      <Modal open={true} onOpenChange={(open) => !open && onClose()}>
        <ModalContent size="md">
          <ModalBody>
            <div className="text-center py-8 text-text-secondary">
              Loading...
            </div>
          </ModalBody>
        </ModalContent>
      </Modal>
    );
  }

  return (
    <Modal open={true} onOpenChange={(open) => !open && onClose()}>
      <ModalContent size="md">
        <ModalHeader>
          <ModalTitle>Edit Transaction</ModalTitle>
        </ModalHeader>

        <form onSubmit={handleSubmit}>
          <ModalBody className="space-y-4 max-h-[60vh] overflow-y-auto">
            {/* Transaction Type Toggle */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Transaction Type
              </label>
              <div className="grid grid-cols-2 gap-3" role="radiogroup" aria-label="Transaction type">
                <button
                  type="button"
                  role="radio"
                  aria-checked={formData.transactionType === "expense"}
                  onClick={() =>
                    setFormData((prev) => ({
                      ...prev,
                      transactionType: "expense",
                    }))
                  }
                  className={`flex items-center justify-center gap-2 px-4 py-3 rounded-xl border-2 font-medium transition-all ${
                    formData.transactionType === "expense"
                      ? "border-expense bg-expense text-white"
                      : "border-border bg-surface text-foreground hover:border-expense/50"
                  }`}
                >
                  <Icon name="expense" size={16} />
                  Expense
                </button>
                <button
                  type="button"
                  role="radio"
                  aria-checked={formData.transactionType === "income"}
                  onClick={() =>
                    setFormData((prev) => ({
                      ...prev,
                      transactionType: "income",
                    }))
                  }
                  className={`flex items-center justify-center gap-2 px-4 py-3 rounded-xl border-2 font-medium transition-all ${
                    formData.transactionType === "income"
                      ? "border-growth bg-growth text-white"
                      : "border-border bg-surface text-foreground hover:border-growth/50"
                  }`}
                >
                  <Icon name="income" size={16} />
                  Income
                </button>
              </div>
            </div>

            {/* Account */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Account
              </label>
              <Select
                value={formData.accountId}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    accountId: e.target.value,
                  }))
                }
                required
              >
                <option value="">Select account</option>
                {accounts.map((account) => (
                  <option key={account._id} value={account._id}>
                    {account.name} ({account.type})
                  </option>
                ))}
              </Select>
            </div>

            {/* Date */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Date
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
                Description
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
                required
              />
            </div>

            {/* Amount */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                {`Amount (${symbol})`}
              </label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={formData.amount}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, amount: e.target.value }))
                }
                required
              />
            </div>

            {/* Category */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Category
              </label>
              <Select
                value={formData.categoryId}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    categoryId: e.target.value,
                  }))
                }
              >
                <option value="">Uncategorized</option>
                {categories.map((category) => (
                  <option key={category._id} value={category._id}>
                    {category.name}
                  </option>
                ))}
              </Select>
            </div>

            {/* Notes */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Notes (Optional)
              </label>
              <Textarea
                value={formData.notes}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, notes: e.target.value }))
                }
                placeholder="Add any additional details..."
                rows={3}
              />
            </div>
          </ModalBody>

          <ModalFooter>
            <Button type="button" onClick={onClose} variant="ghost">
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading}
              isLoading={loading}
              variant="bloom"
            >
              Save Changes
            </Button>
          </ModalFooter>
        </form>
      </ModalContent>
    </Modal>
  );
}
