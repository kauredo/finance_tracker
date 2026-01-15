"use client";

import { useState, useCallback, useEffect } from "react";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Input";
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalTitle,
  ModalBody,
  ModalFooter,
} from "@/components/ui/Modal";
import Icon from "@/components/icons/Icon";

interface UploadStatementModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

export default function UploadStatementModal({
  onClose,
  onSuccess,
}: UploadStatementModalProps) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedAccountId, setSelectedAccountId] = useState<string>("");
  const [isDragging, setIsDragging] = useState(false);

  // Fetch accounts from Convex
  const accounts = useQuery(api.accounts.list);
  const loadingAccounts = accounts === undefined;

  // Set default account when accounts load
  useEffect(() => {
    if (accounts && accounts.length > 0 && !selectedAccountId) {
      setSelectedAccountId(accounts[0]._id);
    }
  }, [accounts, selectedAccountId]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const processFiles = useCallback(
    async (files: File[]) => {
      if (!selectedAccountId) {
        setError("Please select an account first");
        return;
      }

      setUploading(true);
      setError(null);

      try {
        // Validate all files first
        const validExtensions = ["png", "jpg", "jpeg", "csv", "tsv", "pdf"];
        for (const file of files) {
          const fileExt = file.name.split(".").pop()?.toLowerCase();
          if (!validExtensions.includes(fileExt || "")) {
            throw new Error(
              `Invalid file type: ${file.name}. Only PNG, JPEG, PDF, CSV, and TSV files are supported.`,
            );
          }
        }

        // TODO: Implement Convex action for file upload and AI parsing
        // For now, show a message that this feature is being migrated
        throw new Error(
          "Statement upload is being migrated to the new backend. Please add transactions manually for now.",
        );
      } catch (error: any) {
        console.error("Error uploading/processing files:", error);
        setError(error.message);
      } finally {
        setUploading(false);
      }
    },
    [selectedAccountId],
  );

  const handleDrop = useCallback(
    async (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);

      if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        const files = Array.from(e.dataTransfer.files);
        await processFiles(files);
      }
    },
    [processFiles],
  );

  const handleFileUpload = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      if (!e.target.files || e.target.files.length === 0) {
        return;
      }

      const files = Array.from(e.target.files);
      await processFiles(files);
    },
    [processFiles],
  );

  return (
    <Modal open={true} onOpenChange={(open) => !open && onClose()}>
      <ModalContent size="md">
        <ModalHeader>
          <ModalTitle>Upload Bank Statement</ModalTitle>
        </ModalHeader>

        <ModalBody className="space-y-4">
          {loadingAccounts ? (
            <div className="text-center py-8 text-text-secondary">
              Loading accounts...
            </div>
          ) : !accounts || accounts.length === 0 ? (
            <div className="text-center py-8">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-warning-light flex items-center justify-center">
                <Icon name="wallet" size={32} className="text-warning" />
              </div>
              <p className="text-foreground font-medium mb-2">
                No accounts found
              </p>
              <p className="text-sm text-text-secondary">
                Please create an account before uploading statements.
              </p>
            </div>
          ) : (
            <>
              {/* Account Selection */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Select Account
                </label>
                <Select
                  value={selectedAccountId}
                  onChange={(e) => setSelectedAccountId(e.target.value)}
                >
                  {accounts.map((account) => (
                    <option key={account._id} value={account._id}>
                      {account.name} ({account.type})
                    </option>
                  ))}
                </Select>
              </div>

              {/* Drop Zone */}
              <div>
                <label
                  className={cn(
                    "flex flex-col items-center justify-center w-full h-48 border-2 border-dashed rounded-2xl cursor-pointer transition-all duration-200",
                    isDragging
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-primary/50 hover:bg-sand/50 bg-surface",
                  )}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                >
                  <div className="flex flex-col items-center justify-center pt-5 pb-6 px-4 text-center">
                    {uploading ? (
                      <div className="flex flex-col items-center">
                        <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full mb-3" />
                        <p className="text-sm text-text-secondary">
                          Processing with AI...
                        </p>
                      </div>
                    ) : (
                      <>
                        <div
                          className={cn(
                            "p-3 rounded-full mb-3 transition-colors",
                            isDragging
                              ? "bg-primary/10 text-primary"
                              : "bg-sand text-text-secondary",
                          )}
                        >
                          <Icon name="upload" size={32} />
                        </div>
                        <p className="mb-2 text-sm text-foreground font-medium">
                          <span className="text-primary">Click to upload</span>{" "}
                          or drag and drop
                        </p>
                        <p className="text-xs text-text-secondary">
                          Images (PNG/JPEG), PDF, CSV, or TSV files
                        </p>
                        <p className="text-xs text-text-secondary mt-1 flex items-center gap-1">
                          <Icon name="tip" size={12} />
                          Upload multiple images for multi-page statements
                        </p>
                      </>
                    )}
                  </div>
                  <input
                    type="file"
                    className="hidden"
                    accept="image/png,image/jpeg,image/jpg,.png,.jpg,.jpeg,.pdf,application/pdf,.csv,.tsv"
                    multiple
                    onChange={handleFileUpload}
                    disabled={uploading}
                  />
                </label>
              </div>

              {/* Error Message */}
              {error && (
                <div className="p-3 rounded-xl bg-danger/10 border border-danger/20 text-danger text-sm flex items-center gap-2">
                  <Icon name="close" size={16} className="flex-shrink-0" />
                  {error}
                </div>
              )}
            </>
          )}
        </ModalBody>

        <ModalFooter>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
