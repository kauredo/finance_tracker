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

interface AddTransactionModalProps {
  onClose: () => void;
  onSuccess: () => void;
  splitParentId?: Id<"transactions">;
  splitParentData?: {
    description: string;
    amount: number;
    splitParticipants: number;
    accountId: Id<"accounts">;
    categoryId?: Id<"categories">;
  };
}

export default function AddTransactionModal({
  onClose,
  onSuccess,
  splitParentId,
  splitParentData,
}: AddTransactionModalProps) {
  const toast = useToast();
  const { symbol } = useCurrency();
  const [loading, setLoading] = useState(false);

  // Fetch accounts and categories using Convex queries
  const accounts = useQuery(api.accounts.list);
  const categories = useQuery(api.categories.list);

  // Mutation to create transaction
  const createTransaction = useMutation(api.transactions.create);

  const isReimbursementMode = !!splitParentId;
  const suggestedShare = splitParentData
    ? Math.abs(splitParentData.amount) / splitParentData.splitParticipants
    : 0;

  const [formData, setFormData] = useState({
    accountId: (splitParentData?.accountId ?? "") as string,
    date: new Date().toISOString().split("T")[0],
    description: isReimbursementMode
      ? `Reimbursement for ${splitParentData?.description ?? ""}`
      : "",
    amount: isReimbursementMode ? suggestedShare.toFixed(2) : "",
    categoryId: (splitParentData?.categoryId ?? "") as string,
    notes: "",
    transactionType: isReimbursementMode ? "income" : "expense",
    isSplit: false,
    splitParticipants: "2",
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

    const parsedAmount = parseFloat(formData.amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      toast.warning("Please enter a valid amount");
      setLoading(false);
      return;
    }

    try {
      // Calculate final amount (negative for expenses, positive for income)
      const finalAmount =
        formData.transactionType === "expense"
          ? -Math.abs(parsedAmount)
          : Math.abs(parsedAmount);

      await createTransaction({
        accountId: formData.accountId as Id<"accounts">,
        date: formData.date,
        description: formData.description,
        amount: finalAmount,
        categoryId: formData.categoryId
          ? (formData.categoryId as Id<"categories">)
          : undefined,
        notes: formData.notes || undefined,
        isTransfer: formData.transactionType === "transfer" || undefined,
        isSplit: formData.isSplit || undefined,
        splitParticipants: formData.isSplit
          ? parseInt(formData.splitParticipants)
          : undefined,
        splitParentId: splitParentId || undefined,
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
          <ModalTitle>
            {isReimbursementMode ? "Add Reimbursement" : "Add Transaction"}
          </ModalTitle>
        </ModalHeader>

        <form onSubmit={handleSubmit}>
          <ModalBody className="space-y-4 max-h-[60vh] overflow-y-auto">
            {/* Transaction Type Toggle */}
            {!isReimbursementMode && (
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Transaction Type
                </label>
                <div
                  className="grid grid-cols-2 gap-3"
                  role="radiogroup"
                  aria-label="Transaction type"
                >
                  <button
                    type="button"
                    role="radio"
                    aria-checked={formData.transactionType === "expense"}
                    onClick={() =>
                      setFormData((prev) => ({
                        ...prev,
                        transactionType: "expense",
                        isSplit: false,
                      }))
                    }
                    className={`flex items-center justify-center gap-2 px-4 py-3 rounded-xl border-2 font-medium transition-all duration-200 ${
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
                        isSplit: false,
                      }))
                    }
                    className={`flex items-center justify-center gap-2 px-4 py-3 rounded-xl border-2 font-medium transition-all duration-200 ${
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
            )}

            {/* Account */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Account *
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
                {`Amount (${symbol}) *`}
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

            {/* Transfer Toggle */}
            {!isReimbursementMode && (
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.transactionType === "transfer"}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      transactionType: e.target.checked ? "transfer" : "expense",
                      isSplit: false,
                    }))
                  }
                  className="rounded border-border accent-primary w-4 h-4"
                />
                <div>
                  <span className="text-sm font-medium text-foreground">
                    Transfer between my accounts
                  </span>
                  <p className="text-xs text-text-secondary">
                    Excluded from income/expense stats
                  </p>
                </div>
              </label>
            )}

            {/* Split Toggle (expense only, not transfer, not reimbursement) */}
            {!isReimbursementMode &&
              formData.transactionType === "expense" && (
                <>
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.isSplit}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          isSplit: e.target.checked,
                        }))
                      }
                      className="rounded border-border accent-primary w-4 h-4"
                    />
                    <div>
                      <span className="text-sm font-medium text-foreground">
                        Split with others
                      </span>
                      <p className="text-xs text-text-secondary">
                        Track reimbursements and show your real share
                      </p>
                    </div>
                  </label>

                  {formData.isSplit && (
                    <div className="ml-7 space-y-3">
                      <div>
                        <label className="block text-sm font-medium text-foreground mb-2">
                          Total people (including you)
                        </label>
                        <Input
                          type="number"
                          min="2"
                          step="1"
                          value={formData.splitParticipants}
                          onChange={(e) =>
                            setFormData((prev) => ({
                              ...prev,
                              splitParticipants: e.target.value,
                            }))
                          }
                          onBlur={(e) => {
                            const val = parseInt(e.target.value);
                            if (isNaN(val) || val < 2) {
                              setFormData((prev) => ({
                                ...prev,
                                splitParticipants: "2",
                              }));
                            }
                          }}
                          required
                        />
                      </div>
                      {formData.amount && parseInt(formData.splitParticipants) >= 2 && (
                        <p className="text-sm text-primary font-medium">
                          Your share: {symbol}
                          {(
                            parseFloat(formData.amount) /
                            parseInt(formData.splitParticipants)
                          ).toFixed(2)}
                        </p>
                      )}
                    </div>
                  )}
                </>
              )}

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
              {isReimbursementMode ? "Add Reimbursement" : "Create Transaction"}
            </Button>
          </ModalFooter>
        </form>
      </ModalContent>
    </Modal>
  );
}
