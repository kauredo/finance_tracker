"use client";

import { Button } from "@/components/ui/Button";
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalTitle,
  ModalBody,
  ModalFooter,
} from "@/components/ui/Modal";

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
    <Modal open={true} onOpenChange={(open) => !open && onCancel()}>
      <ModalContent size="sm">
        <ModalHeader>
          <ModalTitle>{title}</ModalTitle>
        </ModalHeader>

        <ModalBody className="space-y-4">
          <div
            className={`${
              variant === "danger"
                ? "bg-danger/10 border-danger/30"
                : "bg-primary/10 border-primary/30"
            } border rounded-2xl p-4`}
          >
            <p className="text-foreground">{message}</p>
            {itemName && (
              <p className="text-sm text-text-secondary mt-2">
                <strong className="text-foreground">{itemName}</strong>
              </p>
            )}
          </div>

          {!isInfoOnly && (
            <p className="text-sm text-text-secondary">
              This action cannot be undone.
            </p>
          )}
        </ModalBody>

        <ModalFooter>
          {isInfoOnly ? (
            <Button onClick={onCancel} className="flex-1">
              {confirmText || "OK"}
            </Button>
          ) : (
            <>
              <Button
                onClick={onCancel}
                disabled={isLoading}
                variant="ghost"
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={onConfirm}
                disabled={isLoading}
                variant="danger"
                className="flex-1"
              >
                {isLoading ? "Deleting..." : confirmText || "Delete"}
              </Button>
            </>
          )}
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
