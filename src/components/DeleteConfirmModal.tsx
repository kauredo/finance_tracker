"use client";

import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

interface DeleteConfirmModalProps {
  title: string;
  message: string;
  itemName?: string;
  confirmText?: string;
  onConfirm?: () => void;
  onCancel: () => void;
  isLoading?: boolean;
  variant?: "danger" | "info";
}

export default function DeleteConfirmModal({
  title,
  message,
  itemName,
  confirmText,
  onConfirm,
  onCancel,
  isLoading = false,
  variant = "danger",
}: DeleteConfirmModalProps) {
  const isInfoOnly = !onConfirm || variant === "info";

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <Card variant="glass" className="w-full max-w-md">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-foreground">{title}</h2>
          <Button
            onClick={onCancel}
            disabled={isLoading}
            variant="ghost"
            size="sm"
            className="text-muted hover:text-foreground text-2xl"
          >
            ✕
          </Button>
        </div>

        <div className="space-y-4">
          <div
            className={`${
              variant === "danger"
                ? "bg-danger/10 border-danger/30"
                : "bg-primary/10 border-primary/30"
            } border rounded-lg p-4`}
          >
            <p className="text-foreground">{message}</p>
            {itemName && (
              <p className="text-sm text-muted mt-2">
                <strong className="text-foreground">{itemName}</strong>
              </p>
            )}
          </div>

          {!isInfoOnly && (
            <p className="text-sm text-muted">This action cannot be undone.</p>
          )}

          <div className="flex gap-3 pt-4">
            {isInfoOnly ? (
              <Button
                onClick={onCancel}
                className="flex-1"
              >
                {confirmText || "OK"}
              </Button>
            ) : (
              <>
                <Button
                  onClick={onCancel}
                  disabled={isLoading}
                  variant="secondary"
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  onClick={onConfirm}
                  disabled={isLoading}
                  variant="danger"
                  className="flex-1 shadow-lg hover:shadow-xl"
                >
                  {isLoading ? "Deleting..." : confirmText || "Delete"}
                </Button>
              </>
            )}
          </div>
        </div>
      </Card>
    </div>
  );
}
