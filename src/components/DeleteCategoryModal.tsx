"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import { Button } from "@/components/ui/Button";
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalTitle,
  ModalBody,
  ModalFooter,
} from "@/components/ui/Modal";
import CategoryPicker from "@/components/CategoryPicker";

interface Category {
  id: string;
  name: string;
  color: string;
  icon: string;
}

interface DeleteCategoryModalProps {
  category: Category;
  transactionCount: number;
  onClose: () => void;
  onSuccess: () => void;
}

export default function DeleteCategoryModal({
  category,
  transactionCount,
  onClose,
  onSuccess,
}: DeleteCategoryModalProps) {
  const [reassignId, setReassignId] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const deleteCategory = useMutation(api.categories.remove);

  const handleDelete = async () => {
    if (transactionCount > 0 && !reassignId) {
      setError("Please select a category to reassign transactions to");
      return;
    }

    setLoading(true);
    setError("");

    try {
      await deleteCategory({
        id: category.id as Id<"categories">,
        reassignTo: reassignId ? (reassignId as Id<"categories">) : undefined,
      });

      onSuccess();
    } catch (err: any) {
      console.error("Error deleting category:", err);
      setError(err.message || "Failed to delete category");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal open={true} onOpenChange={(open) => !open && onClose()}>
      <ModalContent size="sm">
        <ModalHeader>
          <ModalTitle>Delete Category</ModalTitle>
        </ModalHeader>

        <ModalBody className="space-y-4">
          <div className="bg-danger/10 border border-danger/30 rounded-2xl p-4">
            <p className="text-foreground font-medium mb-2">
              Are you sure you want to delete{" "}
              <span className="font-bold">{category.name}</span>?
            </p>
            {transactionCount > 0 ? (
              <p className="text-sm text-text-secondary">
                This category is used in <strong>{transactionCount}</strong>{" "}
                transactions. You must reassign them to another category before
                deleting.
              </p>
            ) : (
              <p className="text-sm text-text-secondary">
                This category is not used in any transactions. It will be
                permanently deleted.
              </p>
            )}
          </div>

          {error && (
            <div className="p-3 rounded-xl bg-danger/10 border border-danger/20 text-danger text-sm">
              {error}
            </div>
          )}

          {transactionCount > 0 && (
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Reassign transactions to:
              </label>
              <CategoryPicker
                value={reassignId}
                onChange={setReassignId}
                placeholder="Select a new category"
                disabled={loading}
              />
            </div>
          )}
        </ModalBody>

        <ModalFooter>
          <Button variant="ghost" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button
            variant="danger"
            onClick={handleDelete}
            disabled={loading || (transactionCount > 0 && !reassignId)}
            isLoading={loading}
          >
            Delete Category
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
