"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { createClient } from "@/utils/supabase/client";
import { cn } from "@/lib/utils";
import Icon from "@/components/icons/Icon";

interface Account {
  id: string;
  name: string;
  type: "personal" | "joint";
}

export default function FileUpload({
  onUploadComplete,
}: {
  onUploadComplete: () => void;
}) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState<string>("");
  const [loadingAccounts, setLoadingAccounts] = useState(true);
  const [isDragging, setIsDragging] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      fetchAccounts();
    }
  }, [user]);

  const fetchAccounts = async () => {
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("accounts")
        .select("id, name, type")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setAccounts(data || []);
      if (data && data.length > 0) {
        setSelectedAccountId(data[0].id);
      }
    } catch (error) {
      console.error("Error fetching accounts:", error);
    } finally {
      setLoadingAccounts(false);
    }
  };

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
      if (!user) return;
      if (!selectedAccountId) {
        setError("Please select an account first");
        return;
      }

      setUploading(true);
      setError(null);

      try {
        const supabase = createClient();
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

        // Upload all files to storage
        const uploadedFiles: { filePath: string; fileType: string }[] = [];

        for (const file of files) {
          const fileExt = file.name.split(".").pop();
          const fileName = `${Math.random()}.${fileExt}`;
          const fileType = file.type || `image/${fileExt}`;

          const { error: uploadError } = await supabase.storage
            .from("statements")
            .upload(fileName, file);

          if (uploadError) throw uploadError;

          uploadedFiles.push({ filePath: fileName, fileType });
        }

        // Call API to parse all images together
        const session = await supabase.auth.getSession();
        const token = session.data.session?.access_token;

        const response = await fetch("/api/parse-statement", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            files: uploadedFiles, // Send multiple files
            accountId: selectedAccountId,
          }),
        });

        const result = await response.json();

        if (!response.ok) {
          throw new Error(result.error || "Failed to process files");
        }

        // Show detailed success message
        let message = `Success! Processed ${result.total} transaction(s)`;
        if (result.duplicates > 0) {
          message += ` (${result.new} new, ${result.duplicates} duplicate${result.duplicates > 1 ? "s" : ""} skipped)`;
        }
        message += ` from ${files.length} file${files.length > 1 ? "s" : ""}.`;

        alert(message);
        onUploadComplete();
      } catch (error: any) {
        console.error("Error uploading/processing files:", error);
        setError(error.message);
      } finally {
        setUploading(false);
      }
    },
    [user, selectedAccountId, onUploadComplete],
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

      // Convert FileList to array
      const files = Array.from(e.target.files);
      await processFiles(files);
    },
    [processFiles],
  );

  if (loadingAccounts) {
    return <div className="text-muted text-sm">Loading accounts...</div>;
  }

  if (accounts.length === 0) {
    return (
      <div className="text-center p-4 bg-surface-alt rounded-lg border border-border">
        <p className="text-foreground mb-2">No accounts found</p>
        <p className="text-sm text-muted">
          Please create an account before uploading statements.
        </p>
      </div>
    );
  }

  return (
    <div className="w-full space-y-4">
      <div>
        <label className="block text-foreground text-sm font-medium mb-2">
          Select Account
        </label>
        <select
          value={selectedAccountId}
          onChange={(e) => setSelectedAccountId(e.target.value)}
          className="w-full px-4 py-2 rounded-lg bg-surface border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
        >
          {accounts.map((account) => (
            <option key={account.id} value={account.id}>
              {account.name} ({account.type})
            </option>
          ))}
        </select>
      </div>

      <div className="w-full">
        <label
          className={cn(
            "flex flex-col items-center justify-center w-full h-48 border-2 border-dashed rounded-xl cursor-pointer transition-all duration-200",
            isDragging
              ? "border-primary bg-primary/5"
              : "border-border hover:border-primary/50 hover:bg-surface-alt bg-surface",
          )}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <div className="flex flex-col items-center justify-center pt-5 pb-6 px-4 text-center">
            {uploading ? (
              <div className="flex flex-col items-center">
                <svg
                  className="animate-spin h-8 w-8 text-primary mb-3"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  ></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  ></path>
                </svg>
                <p className="text-sm text-muted">Processing with AI...</p>
              </div>
            ) : (
              <>
                <div
                  className={cn(
                    "p-3 rounded-full mb-3 transition-colors",
                    isDragging
                      ? "bg-primary/10 text-primary"
                      : "bg-surface-alt text-muted",
                  )}
                >
                  <svg
                    className="w-8 h-8"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                    />
                  </svg>
                </div>
                <p className="mb-2 text-sm text-foreground font-medium">
                  <span className="text-primary">Click to upload</span> or drag
                  and drop
                </p>
                <p className="text-xs text-muted">
                  Images (PNG/JPEG), PDF, CSV, or TSV files
                </p>
                <p className="text-xs text-muted mt-1">
                  <Icon name="tip" size={12} className="mr-1 inline-block" />
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
        {error && (
          <div className="mt-3 p-3 text-sm text-danger bg-danger/10 rounded-lg flex items-center gap-2">
            <svg
              className="w-4 h-4 flex-shrink-0"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            {error}
          </div>
        )}
      </div>
    </div>
  );
}
