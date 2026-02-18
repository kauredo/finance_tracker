"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import { useToast } from "@/contexts/ToastContext";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Input, Select } from "@/components/ui/Input";
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalTitle,
  ModalBody,
  ModalFooter,
} from "@/components/ui/Modal";
import DeleteConfirmModal from "@/components/DeleteConfirmModal";
import EditTransactionModal from "@/components/EditTransactionModal";
import RecurringTransactionModal from "@/components/RecurringTransactionModal";
import Icon from "@/components/icons/Icon";
import { useCurrency } from "@/hooks/useCurrency";

interface TransactionDetailModalProps {
  transactionId: Id<"transactions">;
  onClose: () => void;
  onUpdate: () => void;
  onNavigateToTransaction?: (id: Id<"transactions">) => void;
}

export default function TransactionDetailModal({
  transactionId,
  onClose,
  onUpdate,
  onNavigateToTransaction,
}: TransactionDetailModalProps) {
  const toast = useToast();
  const { formatAmount } = useCurrency();
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showRecurringModal, setShowRecurringModal] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Inline reimbursement form state
  const [showInlineForm, setShowInlineForm] = useState(false);
  const [reimbursementForm, setReimbursementForm] = useState({
    description: "",
    amount: "",
    accountId: "",
  });
  const [reimbursementLoading, setReimbursementLoading] = useState(false);

  // Fetch transaction using Convex
  const transaction = useQuery(api.transactions.getById, { id: transactionId });
  const deleteTransaction = useMutation(api.transactions.remove);
  const createTransaction = useMutation(api.transactions.create);

  // Fetch reimbursements for split parents
  const reimbursements = useQuery(
    api.transactions.getReimbursements,
    transaction?.isSplit ? { parentId: transactionId } : "skip",
  );

  // Fetch parent transaction for reimbursement children
  const splitParent = useQuery(
    api.transactions.getById,
    transaction?.splitParentId
      ? { id: transaction.splitParentId }
      : "skip",
  );

  // Fetch accounts for inline reimbursement form
  const accounts = useQuery(
    api.accounts.list,
    transaction?.isSplit ? {} : "skip",
  );

  const loading = transaction === undefined;

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await deleteTransaction({ id: transactionId });
      toast.success("Transaction deleted successfully!");
      onUpdate();
      onClose();
    } catch (error: any) {
      console.error("Error deleting transaction:", error);
      toast.error(error.message || "Failed to delete transaction");
    } finally {
      setDeleting(false);
    }
  };

  const openInlineForm = () => {
    if (!transaction) return;
    const perPersonShare =
      Math.abs(transaction.amount) / (transaction.splitParticipants ?? 2);
    setReimbursementForm({
      description: "",
      amount: perPersonShare.toFixed(2),
      accountId: transaction.accountId,
    });
    setShowInlineForm(true);
  };

  const handleAddReimbursement = async () => {
    if (!transaction || !reimbursementForm.description || !reimbursementForm.amount) {
      toast.warning("Please fill in name and amount");
      return;
    }
    const parsedAmount = parseFloat(reimbursementForm.amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      toast.warning("Please enter a valid amount");
      return;
    }

    setReimbursementLoading(true);
    try {
      await createTransaction({
        accountId: (reimbursementForm.accountId || transaction.accountId) as Id<"accounts">,
        date: new Date().toISOString().split("T")[0],
        description: `Reimbursement from ${reimbursementForm.description}`,
        amount: parsedAmount,
        categoryId: transaction.categoryId ?? undefined,
        splitParentId: transactionId,
      });
      toast.success("Reimbursement added!");
      setShowInlineForm(false);
    } catch (error: any) {
      toast.error(error.message || "Failed to add reimbursement");
    } finally {
      setReimbursementLoading(false);
    }
  };

  if (loading) {
    return (
      <Modal open={true} onOpenChange={(open) => !open && onClose()}>
        <ModalContent size="sm">
          <ModalBody>
            <div className="text-center py-8 text-text-secondary">
              Loading...
            </div>
          </ModalBody>
        </ModalContent>
      </Modal>
    );
  }

  if (!transaction) {
    return null;
  }

  const isExpense = transaction.amount < 0;

  // Pre-compute settlement progress for split parents
  const isSplitParent = transaction.isSplit && transaction.splitParticipants;
  const expectedCount = isSplitParent ? transaction.splitParticipants! - 1 : 0;
  const reimbursedCount = reimbursements?.length ?? 0;
  const reimbursedTotal =
    reimbursements?.reduce((sum, r) => sum + r.amount, 0) ?? 0;
  const expectedTotal = isSplitParent
    ? Math.abs(transaction.amount) -
      Math.abs(transaction.amount) / transaction.splitParticipants!
    : 0;
  const progressPct = Math.min(
    100,
    expectedTotal > 0 ? (reimbursedTotal / expectedTotal) * 100 : 0,
  );
  const isSettled = progressPct >= 100;

  return (
    <>
      <Modal open={true} onOpenChange={(open) => !open && onClose()}>
        <ModalContent size="sm">
          <ModalHeader>
            <ModalTitle>Transaction Details</ModalTitle>
          </ModalHeader>

          <ModalBody className="space-y-4">
            {/* Type Badge */}
            <div>
              <Badge
                variant={isExpense ? "danger" : "growth"}
                icon={
                  <Icon name={isExpense ? "expense" : "income"} size={14} />
                }
              >
                {isExpense ? "Expense" : "Income"}
              </Badge>
            </div>

            {/* Amount */}
            <div className="bg-sand/50 p-4 rounded-2xl">
              <div className="text-sm text-text-secondary mb-1">Amount</div>
              <div
                className={`text-3xl font-bold tabular-nums ${isExpense ? "text-expense" : "text-growth"}`}
              >
                {isExpense ? "-" : "+"}
                {formatAmount(Math.abs(transaction.amount))}
              </div>
            </div>

            {/* Description */}
            <div>
              <div className="text-sm text-text-secondary mb-1">
                Description
              </div>
              <div className="text-foreground font-medium">
                {transaction.description}
              </div>
            </div>

            {/* Date */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-sm text-text-secondary mb-1">Date</div>
                <div className="text-foreground">
                  {new Date(transaction.date).toLocaleDateString()}
                </div>
              </div>
              <div>
                <div className="text-sm text-text-secondary mb-1">Created</div>
                <div className="text-foreground text-sm">
                  {new Date(transaction.createdAt).toLocaleDateString()}
                </div>
              </div>
            </div>

            {/* Category */}
            <div>
              <div className="text-sm text-text-secondary mb-1">Category</div>
              {transaction.category ? (
                <Badge
                  variant="default"
                  icon={
                    <Icon
                      name={(transaction.category.icon as any) || "other"}
                      size={14}
                    />
                  }
                >
                  {transaction.category.name}
                </Badge>
              ) : (
                <span className="text-text-secondary text-sm">
                  Uncategorized
                </span>
              )}
            </div>

            {/* Account */}
            <div>
              <div className="text-sm text-text-secondary mb-1">Account</div>
              <div className="text-foreground">
                <div className="flex items-center gap-2">
                  <Icon
                    name={
                      transaction.account?.type === "personal"
                        ? "personal"
                        : "joint"
                    }
                    size={16}
                  />
                  {transaction.account?.name || "Unknown"}
                </div>
              </div>
            </div>

            {/* Notes */}
            {transaction.notes && (
              <div>
                <div className="text-sm text-text-secondary mb-1">Notes</div>
                <div className="text-foreground text-sm">
                  {transaction.notes}
                </div>
              </div>
            )}

            {/* Split Expense Info (for parent split transactions) */}
            {isSplitParent && (
              <div className="bg-primary-pale/30 p-4 rounded-2xl space-y-3">
                <div className="flex items-center gap-2">
                  <Badge variant="info" icon={<Icon name="joint" size={14} />}>
                    Split {transaction.splitParticipants} ways
                  </Badge>
                </div>

                {/* Your share vs total */}
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <div className="text-text-secondary">Total paid</div>
                    <div className="font-medium text-foreground">
                      {formatAmount(Math.abs(transaction.amount))}
                    </div>
                  </div>
                  <div>
                    <div className="text-text-secondary">Your share</div>
                    <div className="font-medium text-primary">
                      {formatAmount(
                        Math.abs(transaction.amount) / transaction.splitParticipants!,
                      )}
                    </div>
                  </div>
                </div>

                {/* Settlement progress */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-text-secondary">
                      Settlement: {reimbursedCount}/{expectedCount}
                    </span>
                    {isSettled ? (
                      <Badge variant="growth">Settled</Badge>
                    ) : (
                      <span className="text-text-secondary">
                        {formatAmount(reimbursedTotal)} /{" "}
                        {formatAmount(expectedTotal)}
                      </span>
                    )}
                  </div>
                  <div
                    className="w-full bg-border rounded-full h-2"
                    role="progressbar"
                    aria-valuenow={Math.round(progressPct)}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-label={`Settlement progress: ${Math.round(progressPct)}%`}
                  >
                    <div
                      className={`h-2 rounded-full transition-all duration-300 ${isSettled ? "bg-growth" : "bg-primary"}`}
                      style={{ width: `${progressPct}%` }}
                    />
                  </div>
                </div>

                {/* Reimbursement list */}
                {reimbursements && reimbursements.length > 0 ? (
                  <div className="space-y-1.5">
                    <div className="text-xs text-text-secondary font-medium uppercase tracking-wide">
                      Reimbursements
                    </div>
                    {reimbursements.map((r) => (
                      <div
                        key={r._id}
                        className="flex items-center justify-between text-sm py-2"
                      >
                        <span className="text-foreground truncate">
                          {r.description}
                        </span>
                        <span className="text-growth font-medium ml-2">
                          +{formatAmount(r.amount)}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-text-secondary">
                    No reimbursements yet. Add one below to track who paid you back.
                  </p>
                )}

                {/* Inline reimbursement form */}
                {showInlineForm ? (
                  <div className="space-y-2.5 pt-1 border-t border-primary/10">
                    <Input
                      type="text"
                      placeholder="Who paid you back?"
                      aria-label="Name of person who reimbursed you"
                      value={reimbursementForm.description}
                      onChange={(e) =>
                        setReimbursementForm((prev) => ({
                          ...prev,
                          description: e.target.value,
                        }))
                      }
                      autoFocus
                    />
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="Amount"
                      aria-label="Reimbursement amount"
                      value={reimbursementForm.amount}
                      onChange={(e) =>
                        setReimbursementForm((prev) => ({
                          ...prev,
                          amount: e.target.value,
                        }))
                      }
                    />
                    {accounts && accounts.length > 1 && (
                      <Select
                        value={reimbursementForm.accountId}
                        aria-label="Account for reimbursement"
                        onChange={(e) =>
                          setReimbursementForm((prev) => ({
                            ...prev,
                            accountId: e.target.value,
                          }))
                        }
                      >
                        {accounts.map((a) => (
                          <option key={a._id} value={a._id}>
                            {a.name}
                          </option>
                        ))}
                      </Select>
                    )}
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="flex-1"
                        onClick={() => setShowInlineForm(false)}
                        disabled={reimbursementLoading}
                      >
                        Cancel
                      </Button>
                      <Button
                        variant="bloom"
                        size="sm"
                        className="flex-1"
                        onClick={handleAddReimbursement}
                        isLoading={reimbursementLoading}
                        disabled={reimbursementLoading}
                      >
                        Add
                      </Button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={openInlineForm}
                    className="w-full flex items-center justify-center gap-2 p-3 rounded-xl text-sm font-medium text-primary hover:bg-primary-pale/50 active:bg-primary-pale/70 transition-colors duration-200 border border-primary/20"
                  >
                    <Icon name="plus" size={16} />
                    Add reimbursement
                  </button>
                )}
              </div>
            )}

            {/* Reimbursement indicator (for child transactions) — clickable to navigate to parent */}
            {transaction.splitParentId && splitParent && (
              <button
                onClick={() => onNavigateToTransaction?.(transaction.splitParentId!)}
                className="w-full bg-sand/50 p-3 rounded-xl text-left hover:bg-sand/80 active:bg-sand transition-colors duration-200 group"
              >
                <div className="text-xs text-text-secondary mb-1">
                  Reimbursement for
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-foreground font-medium">
                    {splitParent.description}
                  </span>
                  <Icon
                    name="chevron_down"
                    size={14}
                    className="text-text-secondary -rotate-90 group-hover:text-foreground transition-colors"
                  />
                </div>
              </button>
            )}

            {/* Make Recurring */}
            <button
              onClick={() => setShowRecurringModal(true)}
              className="w-full flex items-center gap-3 p-3 rounded-xl text-sm text-text-secondary hover:bg-sand/50 hover:text-foreground active:bg-sand/70 transition-colors duration-200"
            >
              <Icon name="subscriptions" size={16} />
              Make this recurring
              <Icon
                name="chevron_down"
                size={14}
                className="ml-auto -rotate-90"
              />
            </button>
          </ModalBody>

          <ModalFooter>
            <Button
              onClick={() => setShowEditModal(true)}
              variant="ghost"
              className="flex-1"
            >
              <Icon name="edit" size={18} className="mr-2" />
              Edit
            </Button>
            <Button
              onClick={() => setShowDeleteModal(true)}
              variant="danger"
              className="flex-1"
            >
              <Icon name="delete" size={18} className="mr-2" />
              Delete
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Edit Modal */}
      {showEditModal && (
        <EditTransactionModal
          transactionId={transactionId}
          onClose={() => setShowEditModal(false)}
          onSuccess={() => {
            setShowEditModal(false);
            onUpdate();
          }}
        />
      )}

      {/* Recurring Modal */}
      {showRecurringModal && transaction && (
        <RecurringTransactionModal
          isOpen={true}
          onClose={() => setShowRecurringModal(false)}
          onSuccess={() => {
            setShowRecurringModal(false);
            toast.success("Recurring transaction created!");
          }}
          initialData={{
            description: transaction.description,
            amount: transaction.amount,
            interval: "monthly",
            accountId: transaction.accountId,
            categoryId: transaction.categoryId ?? undefined,
          }}
        />
      )}

      {/* Delete Confirmation */}
      {showDeleteModal && (
        <DeleteConfirmModal
          title="Delete Transaction"
          message={
            transaction.isSplit
              ? "Deleting this split expense will unlink all reimbursements. Are you sure?"
              : "Are you sure you want to delete this transaction?"
          }
          itemName={transaction.description}
          isLoading={deleting}
          onConfirm={handleDelete}
          onCancel={() => setShowDeleteModal(false)}
        />
      )}
    </>
  );
}
