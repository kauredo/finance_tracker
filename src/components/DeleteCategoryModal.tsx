"use client";

import { useState } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
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

  const handleDelete = async () => {
    if (transactionCount > 0 && !reassignId) {
      setError("Please select a category to reassign transactions to");
      return;
    }

    setLoading(true);
    setError("");

    try {
      let url = `/api/categories/${category.id}`;
      if (reassignId) {
        url += `?reassign_to=${reassignId}`;
      }

      const response = await fetch(url, {
        method: "DELETE",
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to delete category");
      }

      onSuccess();
    } catch (err: any) {
      console.error("Error deleting category:", err);
      setError(err.message || "Failed to delete category");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <Card variant="glass" className="w-full max-w-md">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-foreground">
            Delete Category
          </h2>
          <Button
            onClick={onClose}
            disabled={loading}
            variant="ghost"
            size="sm"
            className="text-muted hover:text-foreground text-2xl"
          >
            ✕
          </Button>
        </div>

        <div className="space-y-6">
          <div className="bg-danger/10 border border-danger/30 rounded-lg p-4">
            <p className="text-foreground font-medium mb-2">
              Are you sure you want to delete{" "}
              <span className="font-bold">{category.name}</span>?
            </p>
            {transactionCount > 0 ? (
              <p className="text-sm text-muted">
                This category is used in <strong>{transactionCount}</strong>{" "}
                transactions. You must reassign them to another category before
                deleting.
              </p>
            ) : (
              <p className="text-sm text-muted">
                This category is not used in any transactions. It will be
                permanently deleted.
              </p>
            )}
          </div>

          {error && (
            <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-500 text-sm">
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

          <div className="flex gap-3 pt-2">
            <Button
              variant="secondary"
              onClick={onClose}
              disabled={loading}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={handleDelete}
              disabled={loading || (transactionCount > 0 && !reassignId)}
              className="flex-1"
            >
              {loading ? "Deleting..." : "Delete Category"}
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
