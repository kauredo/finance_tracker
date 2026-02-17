"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import { useToast } from "@/contexts/ToastContext";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
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
}

export default function TransactionDetailModal({
  transactionId,
  onClose,
  onUpdate,
}: TransactionDetailModalProps) {
  const toast = useToast();
  const { formatAmount } = useCurrency();
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showRecurringModal, setShowRecurringModal] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Fetch transaction using Convex
  const transaction = useQuery(api.transactions.getById, { id: transactionId });
  const deleteTransaction = useMutation(api.transactions.remove);

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

            {/* Make Recurring */}
            <button
              onClick={() => setShowRecurringModal(true)}
              className="w-full flex items-center gap-3 p-3 rounded-xl text-sm text-text-secondary hover:bg-sand/50 hover:text-foreground transition-colors"
            >
              <Icon name="subscriptions" size={16} />
              Make this recurring
              <Icon name="chevron_down" size={14} className="ml-auto -rotate-90" />
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
            // With Convex, data auto-refreshes!
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
          message="Are you sure you want to delete this transaction?"
          itemName={transaction.description}
          isLoading={deleting}
          onConfirm={handleDelete}
          onCancel={() => setShowDeleteModal(false)}
        />
      )}
    </>
  );
}
