"use client";

import { useState, useCallback, useEffect } from "react";
import { useQuery, useMutation, useAction } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import { cn } from "@/lib/utils";
import { useToast } from "@/contexts/ToastContext";
import { useCurrency } from "@/hooks/useCurrency";
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

interface PreviewTransaction {
  date: string;
  description: string;
  amount: number;
  category: string;
  categoryId?: Id<"categories">;
  isDuplicate: boolean;
  isTransfer: boolean;
  selected: boolean;
}

interface CategoryOption {
  id: Id<"categories">;
  name: string;
}

type UploadStep =
  | "select"
  | "uploading"
  | "processing"
  | "review"
  | "committing"
  | "complete"
  | "error";

export default function UploadStatementModal({
  onClose,
  onSuccess,
}: UploadStatementModalProps) {
  const toast = useToast();
  const { formatAmount } = useCurrency();
  const [step, setStep] = useState<UploadStep>("select");
  const [error, setError] = useState<string | null>(null);
  const [selectedAccountId, setSelectedAccountId] = useState<string>("");
  const [isDragging, setIsDragging] = useState(false);
  const [transactionCount, setTransactionCount] = useState(0);

  // Review state
  const [originalTransactions, setOriginalTransactions] = useState<
    PreviewTransaction[]
  >([]);
  const [previewTransactions, setPreviewTransactions] = useState<
    PreviewTransaction[]
  >([]);
  const [availableCategories, setAvailableCategories] = useState<
    CategoryOption[]
  >([]);
  const [wasTruncated, setWasTruncated] = useState(false);
  const [uploadedStorageId, setUploadedStorageId] =
    useState<Id<"_storage"> | null>(null);
  const [uploadedFileName, setUploadedFileName] = useState("");
  const [uploadedFileType, setUploadedFileType] = useState("");

  // Fetch accounts from Convex
  const accounts = useQuery(api.accounts.list);
  const loadingAccounts = accounts === undefined;

  // Convex actions
  const generateUploadUrl = useMutation(api.statements.generateUploadUrl);
  const parseStatement = useAction(api.statements.parseStatement);
  const commitStatement = useAction(api.statements.commitStatement);

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

      const maxSizeMB = 10;
      if (file.size > maxSizeMB * 1024 * 1024) {
        setError(
          `File too large (${(file.size / 1024 / 1024).toFixed(1)}MB). Maximum size is ${maxSizeMB}MB.`,
        );
        return;
      }

      const validExtensions = ["png", "jpg", "jpeg", "csv", "tsv", "pdf"];
      const fileExt = file.name.split(".").pop()?.toLowerCase();
      if (!fileExt || !validExtensions.includes(fileExt)) {
        setError(
          `Invalid file type: ${file.name}. Only PNG, JPEG, PDF, CSV, and TSV files are supported.`,
        );
        return;
      }

      setError(null);
      setStep("uploading");

      try {
        // Step 1: Upload file
        const uploadUrl = await generateUploadUrl();
        const uploadResponse = await fetch(uploadUrl, {
          method: "POST",
          headers: { "Content-Type": file.type },
          body: file,
        });

        if (!uploadResponse.ok) throw new Error("Failed to upload file");
        const { storageId } = await uploadResponse.json();

        // Step 2: Parse with AI (no commit)
        setStep("processing");
        setUploadedStorageId(storageId as Id<"_storage">);
        setUploadedFileName(file.name);
        setUploadedFileType(file.type);

        const result = await parseStatement({
          storageId: storageId as Id<"_storage">,
          accountId: selectedAccountId as Id<"accounts">,
          fileName: file.name,
          fileType: file.type,
        });

        // Step 3: Show review
        const preview: PreviewTransaction[] = result.preview.map(
          (t: {
            date: string;
            description: string;
            amount: number;
            category: string;
            categoryId?: Id<"categories">;
            isDuplicate: boolean;
            isTransfer: boolean;
          }) => ({
            ...t,
            selected: !t.isDuplicate,
          }),
        );

        setOriginalTransactions(preview);
        setPreviewTransactions(preview);
        setAvailableCategories(result.availableCategories as CategoryOption[]);
        setWasTruncated(result.wasTruncated);
        setStep("review");
      } catch (err: any) {
        console.error("Error processing statement:", err);
        setError(err.message || "Failed to process statement");
        setStep("error");
      }
    },
    [selectedAccountId, generateUploadUrl, parseStatement],
  );

  const handleCommit = async () => {
    if (!uploadedStorageId) return;

    const selected = previewTransactions.filter((t) => t.selected);
    if (selected.length === 0) {
      toast.warning("Select at least one transaction to import.");
      return;
    }

    const invalid = selected.filter(
      (t) =>
        !t.date ||
        !/^\d{4}-\d{2}-\d{2}$/.test(t.date) ||
        !t.description ||
        t.description.trim().length < 2 ||
        !isFinite(t.amount) ||
        t.amount === 0,
    );
    if (invalid.length > 0) {
      toast.error(
        `${invalid.length} selected transaction${invalid.length !== 1 ? "s have" : " has"} invalid data. Check dates, descriptions, and amounts.`,
      );
      return;
    }

    setStep("committing");
    try {
      const result = await commitStatement({
        storageId: uploadedStorageId,
        accountId: selectedAccountId as Id<"accounts">,
        fileName: uploadedFileName,
        fileType: uploadedFileType,
        transactions: selected.map((t) => ({
          date: t.date,
          description: t.description,
          amount: t.amount,
          categoryId: t.categoryId,
          isTransfer: t.isTransfer || undefined,
        })),
      });

      setTransactionCount(result.transactionCount);
      setStep("complete");
      toast.success(
        `Successfully imported ${result.transactionCount} transactions!`,
      );
    } catch (err: any) {
      console.error("Error committing:", err);
      setError(err.message || "Failed to import transactions");
      setStep("error");
    }
  };

  const handleDrop = useCallback(
    async (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        await processFile(e.dataTransfer.files[0]);
      }
    },
    [processFile],
  );

  const handleFileUpload = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      if (!e.target.files || e.target.files.length === 0) return;
      await processFile(e.target.files[0]);
    },
    [processFile],
  );

  const handleClose = () => {
    if (step === "complete") onSuccess();
    onClose();
  };

  const resetAndTryAgain = () => {
    setStep("select");
    setError(null);
    setTransactionCount(0);
    setOriginalTransactions([]);
    setPreviewTransactions([]);
    setUploadedStorageId(null);
    setWasTruncated(false);
  };

  const toggleTransaction = (index: number) => {
    setPreviewTransactions((prev) =>
      prev.map((t, i) => (i === index ? { ...t, selected: !t.selected } : t)),
    );
  };

  const toggleAll = () => {
    const nonDuplicates = previewTransactions.filter((t) => !t.isDuplicate);
    const allSelected = nonDuplicates.every((t) => t.selected);
    setPreviewTransactions((prev) =>
      prev.map((t) => (t.isDuplicate ? t : { ...t, selected: !allSelected })),
    );
  };

  const updateField = (
    index: number,
    field: "date" | "description" | "amount",
    value: string,
  ) => {
    setPreviewTransactions((prev) =>
      prev.map((t, i) =>
        i === index
          ? {
              ...t,
              [field]: field === "amount" ? parseFloat(value) || 0 : value,
            }
          : t,
      ),
    );
  };

  const updateCategory = (index: number, categoryId: string) => {
    const cat = availableCategories.find((c) => c.id === categoryId);
    setPreviewTransactions((prev) =>
      prev.map((t, i) =>
        i === index
          ? {
              ...t,
              categoryId: categoryId
                ? (categoryId as Id<"categories">)
                : undefined,
              category: cat?.name || "Other",
            }
          : t,
      ),
    );
  };

  const resetTransaction = (index: number) => {
    const orig = originalTransactions[index];
    if (!orig) return;
    setPreviewTransactions((prev) =>
      prev.map((t, i) => (i === index ? { ...orig, selected: t.selected } : t)),
    );
  };

  const isRowModified = (index: number) => {
    const orig = originalTransactions[index];
    const curr = previewTransactions[index];
    if (!orig || !curr) return false;
    return (
      orig.date !== curr.date ||
      orig.description !== curr.description ||
      orig.amount !== curr.amount ||
      orig.categoryId !== curr.categoryId
    );
  };

  const selectedCount = previewTransactions.filter((t) => t.selected).length;
  const duplicateCount = previewTransactions.filter(
    (t) => t.isDuplicate,
  ).length;

  const modalSize = step === "review" ? "xl" : "md";

  return (
    <Modal open={true} onOpenChange={(open) => !open && handleClose()}>
      <ModalContent size={modalSize}>
        <ModalHeader>
          <ModalTitle>
            {step === "review"
              ? "Review Transactions"
              : step === "complete"
                ? "Import Complete"
                : "Upload Bank Statement"}
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
          ) : step === "review" ? (
            // Review state - show parsed transactions
            <>
              <div className="flex items-center justify-between">
                <p className="text-sm text-text-secondary">
                  {previewTransactions.length} transactions found
                  {duplicateCount > 0 && (
                    <span className="text-warning">
                      {" "}
                      ({duplicateCount} duplicate
                      {duplicateCount !== 1 ? "s" : ""})
                    </span>
                  )}
                </p>
                <Button variant="ghost" size="sm" onClick={toggleAll}>
                  {previewTransactions
                    .filter((t) => !t.isDuplicate)
                    .every((t) => t.selected)
                    ? "Deselect all"
                    : "Select all"}
                </Button>
              </div>

              <div className="flex items-start gap-2 p-3 rounded-xl bg-warning-light/50 border border-warning/20 text-sm text-text-secondary">
                <Icon
                  name="tip"
                  size={16}
                  className="text-warning flex-shrink-0 mt-0.5"
                />
                <span>
                  AI extraction may contain errors. Click any value to edit it.
                  Negative amounts are expenses, positive are income. Editing
                  values won&apos;t re-check for duplicates.
                </span>
              </div>

              {wasTruncated && (
                <div className="flex items-start gap-2 p-3 rounded-xl bg-danger/5 border border-danger/20 text-sm text-text-secondary">
                  <Icon
                    name="close"
                    size={16}
                    className="text-danger flex-shrink-0 mt-0.5"
                  />
                  <span>
                    Your file was too large to process entirely. Some
                    transactions at the end may be missing.
                  </span>
                </div>
              )}

              <div className="max-h-[50vh] overflow-y-auto border border-border rounded-xl">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-surface border-b border-border">
                    <tr className="text-left text-text-secondary">
                      <th className="p-3 w-10"></th>
                      <th className="p-3">Date</th>
                      <th className="p-3">Description</th>
                      <th className="p-3">Category</th>
                      <th className="p-3 text-right">Amount</th>
                      <th className="p-3 w-10"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {previewTransactions.map((t, i) => (
                      <tr
                        key={i}
                        className={cn(
                          "border-b border-border/50 last:border-0 transition-colors",
                          t.isDuplicate && "opacity-50 bg-sand/30",
                          t.selected && !t.isDuplicate && "bg-growth-pale/30",
                          !t.selected && !t.isDuplicate && "hover:bg-sand/20",
                        )}
                      >
                        <td className="p-3">
                          <input
                            type="checkbox"
                            checked={t.selected}
                            disabled={t.isDuplicate}
                            onChange={() => toggleTransaction(i)}
                            className="rounded border-border accent-primary"
                          />
                        </td>
                        <td className="p-3 whitespace-nowrap tabular-nums">
                          <input
                            type="date"
                            value={t.date}
                            disabled={t.isDuplicate}
                            onChange={(e) =>
                              updateField(i, "date", e.target.value)
                            }
                            className="text-sm border border-transparent rounded-lg px-1.5 py-0.5 bg-transparent hover:border-border focus:border-primary focus:bg-surface focus:outline-none disabled:hover:border-transparent"
                          />
                        </td>
                        <td className="p-3">
                          <div className="flex items-center gap-2">
                            <input
                              type="text"
                              value={t.description}
                              disabled={t.isDuplicate}
                              onChange={(e) =>
                                updateField(i, "description", e.target.value)
                              }
                              className="text-sm w-full min-w-[120px] border border-transparent rounded-lg px-1.5 py-0.5 bg-transparent hover:border-border focus:border-primary focus:bg-surface focus:outline-none disabled:hover:border-transparent"
                            />
                            {t.isTransfer && (
                              <button
                                type="button"
                                onClick={() =>
                                  setPreviewTransactions((prev) =>
                                    prev.map((pt, pi) =>
                                      pi === i
                                        ? { ...pt, isTransfer: !pt.isTransfer }
                                        : pt,
                                    ),
                                  )
                                }
                                className="text-xs px-1.5 py-0.5 rounded bg-primary/10 text-primary whitespace-nowrap hover:bg-primary/20 transition-colors"
                                title="Click to remove transfer flag"
                              >
                                transfer
                              </button>
                            )}
                            {t.isDuplicate && (
                              <span className="text-xs px-1.5 py-0.5 rounded bg-warning/10 text-warning whitespace-nowrap">
                                duplicate
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="p-3">
                          <select
                            value={t.categoryId || ""}
                            onChange={(e) => updateCategory(i, e.target.value)}
                            disabled={t.isDuplicate}
                            className="text-xs border border-border rounded-lg px-2 py-1 bg-surface"
                          >
                            <option value="">Other</option>
                            {availableCategories.map((c) => (
                              <option key={c.id} value={c.id}>
                                {c.name}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="p-3 text-right whitespace-nowrap">
                          <input
                            type="number"
                            step="0.01"
                            value={t.amount}
                            disabled={t.isDuplicate}
                            onChange={(e) =>
                              updateField(i, "amount", e.target.value)
                            }
                            className={cn(
                              "text-sm font-medium tabular-nums text-right w-28 border border-transparent rounded-lg px-1.5 py-0.5 bg-transparent hover:border-border focus:border-primary focus:bg-surface focus:outline-none disabled:hover:border-transparent",
                              t.amount > 0 ? "text-growth" : "text-foreground",
                            )}
                          />
                        </td>
                        <td className="p-3">
                          {isRowModified(i) && !t.isDuplicate && (
                            <button
                              onClick={() => resetTransaction(i)}
                              className="text-muted hover:text-primary transition-colors"
                              title="Reset to original"
                            >
                              <Icon name="close" size={14} />
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          ) : step === "complete" ? (
            <div className="text-center py-8">
              <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-growth-pale flex items-center justify-center">
                <Icon name="check" size={40} className="text-growth" />
              </div>
              <h3 className="text-xl font-semibold text-foreground mb-2">
                Import Successful!
              </h3>
              <p className="text-text-secondary">
                {transactionCount} transaction
                {transactionCount !== 1 ? "s" : ""} imported successfully.
              </p>
            </div>
          ) : step === "error" ? (
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
          ) : step === "uploading" ||
            step === "processing" ||
            step === "committing" ? (
            <div className="text-center py-12">
              <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-primary-pale flex items-center justify-center">
                <div className="animate-spin h-10 w-10 border-3 border-primary border-t-transparent rounded-full" />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">
                {step === "uploading"
                  ? "Uploading file..."
                  : step === "processing"
                    ? "Analyzing with AI..."
                    : "Importing transactions..."}
              </h3>
              <p className="text-text-secondary text-sm">
                {step === "uploading"
                  ? "Please wait while we upload your file."
                  : step === "processing"
                    ? "Our AI is extracting transactions from your statement. This may take a moment."
                    : "Saving your reviewed transactions."}
              </p>
            </div>
          ) : (
            // Selection state
            <>
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
                      <span className="text-primary">Click to upload</span> or
                      drag and drop
                    </p>
                    <p className="text-xs text-text-secondary">
                      Images (PNG/JPEG), PDF, CSV, or TSV files
                    </p>
                    <p className="text-xs text-text-secondary mt-1 flex items-center gap-1">
                      <Icon name="tip" size={12} />
                      AI will extract transactions for you to review
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
          {step === "review" ? (
            <div className="flex items-center justify-between w-full">
              <Button variant="ghost" onClick={resetAndTryAgain}>
                Back
              </Button>
              <div className="flex items-center gap-3">
                <span className="text-sm text-text-secondary">
                  {selectedCount} of {previewTransactions.length} selected
                </span>
                <Button
                  variant="bloom"
                  onClick={handleCommit}
                  disabled={selectedCount === 0}
                >
                  Import {selectedCount} transaction
                  {selectedCount !== 1 ? "s" : ""}
                </Button>
              </div>
            </div>
          ) : step === "complete" ? (
            <Button variant="bloom" onClick={handleClose}>
              Done
            </Button>
          ) : step === "error" ? (
            <Button variant="ghost" onClick={handleClose}>
              Close
            </Button>
          ) : step === "uploading" ||
            step === "processing" ||
            step === "committing" ? null : (
            <Button variant="ghost" onClick={handleClose}>
              Cancel
            </Button>
          )}
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
