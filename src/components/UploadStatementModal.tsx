"use client";

import { useState, useCallback, useEffect } from "react";
import { useQuery, useMutation, useAction } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import { cn } from "@/lib/utils";
import { useToast } from "@/contexts/ToastContext";
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

type UploadStep = "select" | "uploading" | "processing" | "complete" | "error";

export default function UploadStatementModal({
  onClose,
  onSuccess,
}: UploadStatementModalProps) {
  const toast = useToast();
  const [step, setStep] = useState<UploadStep>("select");
  const [error, setError] = useState<string | null>(null);
  const [selectedAccountId, setSelectedAccountId] = useState<string>("");
  const [isDragging, setIsDragging] = useState(false);
  const [transactionCount, setTransactionCount] = useState(0);

  // Fetch accounts from Convex
  const accounts = useQuery(api.accounts.list);
  const loadingAccounts = accounts === undefined;

  // Convex mutations and actions
  const generateUploadUrl = useMutation(api.statements.generateUploadUrl);
  const processStatement = useAction(api.statements.processStatement);

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

  const processFile = useCallback(
    async (file: File) => {
      if (!selectedAccountId) {
        setError("Please select an account first");
        return;
      }

      // Validate file type
      const validExtensions = ["png", "jpg", "jpeg", "csv", "tsv", "pdf"];
      const fileExt = file.name.split(".").pop()?.toLowerCase();
      if (!fileExt || !validExtensions.includes(fileExt)) {
        setError(
          `Invalid file type: ${file.name}. Only PNG, JPEG, PDF, CSV, and TSV files are supported.`
        );
        return;
      }

      setError(null);
      setStep("uploading");

      try {
        // Step 1: Get upload URL
        const uploadUrl = await generateUploadUrl();

        // Step 2: Upload the file
        const uploadResponse = await fetch(uploadUrl, {
          method: "POST",
          headers: {
            "Content-Type": file.type,
          },
          body: file,
        });

        if (!uploadResponse.ok) {
          throw new Error("Failed to upload file");
        }

        const { storageId } = await uploadResponse.json();

        // Step 3: Process with AI
        setStep("processing");

        const result = await processStatement({
          storageId: storageId as Id<"_storage">,
          accountId: selectedAccountId as Id<"accounts">,
          fileName: file.name,
          fileType: file.type,
        });

        // Success!
        setTransactionCount(result.transactionCount);
        setStep("complete");
        toast.success(`Successfully imported ${result.transactionCount} transactions!`);
      } catch (err: any) {
        console.error("Error processing statement:", err);
        setError(err.message || "Failed to process statement");
        setStep("error");
      }
    },
    [selectedAccountId, generateUploadUrl, processStatement, toast]
  );

  const handleDrop = useCallback(
    async (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);

      if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        const file = e.dataTransfer.files[0];
        await processFile(file);
      }
    },
    [processFile]
  );

  const handleFileUpload = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      if (!e.target.files || e.target.files.length === 0) {
        return;
      }

      const file = e.target.files[0];
      await processFile(file);
    },
    [processFile]
  );

  const handleClose = () => {
    if (step === "complete") {
      onSuccess();
    }
    onClose();
  };

  const resetAndTryAgain = () => {
    setStep("select");
    setError(null);
    setTransactionCount(0);
  };

  return (
    <Modal open={true} onOpenChange={(open) => !open && handleClose()}>
      <ModalContent size="md">
        <ModalHeader>
          <ModalTitle>
            {step === "complete" ? "Import Complete" : "Upload Bank Statement"}
          </ModalTitle>
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
          ) : step === "complete" ? (
            // Success state
            <div className="text-center py-8">
              <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-growth-pale flex items-center justify-center">
                <Icon name="check" size={40} className="text-growth" />
              </div>
              <h3 className="text-xl font-semibold text-foreground mb-2">
                Import Successful!
              </h3>
              <p className="text-text-secondary">
                {transactionCount} transaction{transactionCount !== 1 ? "s" : ""}{" "}
                imported successfully.
              </p>
            </div>
          ) : step === "error" ? (
            // Error state
            <div className="text-center py-8">
              <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-danger/10 flex items-center justify-center">
                <Icon name="close" size={40} className="text-danger" />
              </div>
              <h3 className="text-xl font-semibold text-foreground mb-2">
                Import Failed
              </h3>
              <p className="text-text-secondary mb-4">{error}</p>
              <Button variant="secondary" onClick={resetAndTryAgain}>
                Try Again
              </Button>
            </div>
          ) : step === "uploading" || step === "processing" ? (
            // Processing state
            <div className="text-center py-12">
              <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-primary-pale flex items-center justify-center">
                <div className="animate-spin h-10 w-10 border-3 border-primary border-t-transparent rounded-full" />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">
                {step === "uploading" ? "Uploading file..." : "Analyzing with AI..."}
              </h3>
              <p className="text-text-secondary text-sm">
                {step === "uploading"
                  ? "Please wait while we upload your file."
                  : "Our AI is extracting transactions from your statement. This may take a moment."}
              </p>
            </div>
          ) : (
            // Selection state
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
                      : "border-border hover:border-primary/50 hover:bg-sand/50 bg-surface"
                  )}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                >
                  <div className="flex flex-col items-center justify-center pt-5 pb-6 px-4 text-center">
                    <div
                      className={cn(
                        "p-3 rounded-full mb-3 transition-colors",
                        isDragging
                          ? "bg-primary/10 text-primary"
                          : "bg-sand text-text-secondary"
                      )}
                    >
                      <Icon name="upload" size={32} />
                    </div>
                    <p className="mb-2 text-sm text-foreground font-medium">
                      <span className="text-primary">Click to upload</span> or
                      drag and drop
                    </p>
                    <p className="text-xs text-text-secondary">
                      Images (PNG/JPEG), PDF, CSV, or TSV files
                    </p>
                    <p className="text-xs text-text-secondary mt-1 flex items-center gap-1">
                      <Icon name="tip" size={12} />
                      AI will automatically extract transactions
                    </p>
                  </div>
                  <input
                    type="file"
                    className="hidden"
                    accept="image/png,image/jpeg,image/jpg,.png,.jpg,.jpeg,.pdf,application/pdf,.csv,.tsv"
                    onChange={handleFileUpload}
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
          {step === "complete" ? (
            <Button variant="bloom" onClick={handleClose}>
              Done
            </Button>
          ) : step === "error" ? (
            <Button variant="ghost" onClick={handleClose}>
              Close
            </Button>
          ) : step === "uploading" || step === "processing" ? null : (
            <Button variant="ghost" onClick={handleClose}>
              Cancel
            </Button>
          )}
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
