"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/contexts/ToastContext";
import NavBar from "@/components/NavBar";
import { Card, CardContent, MotionCard } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Select, Input } from "@/components/ui/Input";
import Icon from "@/components/icons/Icon";
import Image from "next/image";
import { format } from "date-fns";
import { createClient } from "@/utils/supabase/client";
import { motion } from "motion/react";

interface Account {
  id: string;
  name: string;
}

const exportFormats = [
  {
    id: "csv",
    name: "CSV",
    emoji: "📄",
    description: "Spreadsheet compatible",
    subtitle: "Works in Excel, Google Sheets, etc.",
  },
  {
    id: "excel",
    name: "Excel",
    emoji: "📊",
    description: "Formatted with summaries",
    subtitle: "Includes colors and totals",
  },
];

export default function DataExportPage() {
  const { user, loading: authLoading } = useAuth();
  const { error: showError, success: showSuccess } = useToast();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  // Filters
  const [selectedAccount, setSelectedAccount] = useState<string>("all");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>(
    format(new Date(), "yyyy-MM-dd"),
  );
  const [exportFormat, setExportFormat] = useState<"csv" | "excel">("csv");

  useEffect(() => {
    if (user) {
      fetchAccounts();
    }
  }, [user]);

  const fetchAccounts = async () => {
    setLoading(true);
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("accounts")
        .select("id, name")
        .order("name");

      if (error) throw error;
      setAccounts(data || []);
    } catch (error) {
      console.error("Error fetching accounts:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      // Build query parameters
      const params = new URLSearchParams();
      params.append("format", exportFormat);

      if (selectedAccount !== "all") {
        params.append("accountId", selectedAccount);
      }

      if (startDate) {
        params.append("startDate", startDate);
      }

      if (endDate) {
        params.append("endDate", endDate);
      }

      const response = await fetch(`/api/export?${params.toString()}`);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error("Export API error:", errorData);
        throw new Error(errorData.error || "Export failed");
      }

      // Download the file
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `transactions_${format(new Date(), "yyyy-MM-dd")}.${exportFormat === "csv" ? "csv" : "xlsx"}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      showSuccess("Your data has been harvested! 🌾");
    } catch (error) {
      console.error("Error exporting data:", error);
      showError(
        error instanceof Error ? error.message : "Failed to export data",
      );
    } finally {
      setExporting(false);
    }
  };

  if (authLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
        >
          <Image src="/logo.png" alt="Loading" width={48} height={48} />
        </motion.div>
      </div>
    );
  }

  return (
    <>
      <NavBar />
      <div className="min-h-screen bg-background">
        {/* Hero Header */}
        <div className="bg-gradient-to-br from-growth-pale via-cream to-sand">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center gap-4"
            >
              <div className="p-4 bg-surface rounded-2xl shadow-sm">
                <motion.span
                  className="text-4xl block"
                  animate={{ y: [0, -5, 0] }}
                  transition={{ duration: 2, repeat: Infinity }}
                >
                  🌾
                </motion.span>
              </div>
              <div>
                <h1 className="text-3xl font-display font-bold text-foreground">
                  Harvest Your Data
                </h1>
                <p className="text-text-secondary">
                  Export your financial history to take with you
                </p>
              </div>
            </motion.div>
          </div>
        </div>

        <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 -mt-6">
          <div className="space-y-6">
            {/* Format Selection */}
            <MotionCard transition={{ delay: 0.1 }}>
              <CardContent className="p-6">
                <h2 className="font-display font-bold text-foreground mb-4 flex items-center gap-2">
                  <Icon name="download" size={20} className="text-primary" />
                  Choose Export Format
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {exportFormats.map((format, index) => (
                    <motion.button
                      key={format.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.1 + index * 0.05 }}
                      onClick={() => setExportFormat(format.id as "csv" | "excel")}
                      className={`p-5 rounded-2xl border-2 transition-all text-left ${
                        exportFormat === format.id
                          ? "border-primary bg-primary-pale shadow-md"
                          : "border-border bg-surface hover:border-primary/30 hover:shadow-sm"
                      }`}
                    >
                      <div className="flex items-start gap-4">
                        <span className="text-3xl">{format.emoji}</span>
                        <div>
                          <h3 className="font-display font-bold text-foreground mb-1">
                            {format.name}
                          </h3>
                          <p className="text-sm text-text-secondary">
                            {format.description}
                          </p>
                          <p className="text-xs text-text-secondary mt-1">
                            {format.subtitle}
                          </p>
                        </div>
                        {exportFormat === format.id && (
                          <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            className="ml-auto"
                          >
                            <div className="w-6 h-6 bg-primary rounded-full flex items-center justify-center">
                              <Icon name="check" size={14} className="text-white" />
                            </div>
                          </motion.div>
                        )}
                      </div>
                    </motion.button>
                  ))}
                </div>
              </CardContent>
            </MotionCard>

            {/* Filters */}
            <MotionCard transition={{ delay: 0.2 }}>
              <CardContent className="p-6">
                <h2 className="font-display font-bold text-foreground mb-4 flex items-center gap-2">
                  <Icon name="search" size={20} className="text-primary" />
                  Filter Your Harvest
                </h2>

                <div className="space-y-4">
                  {/* Account Filter */}
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Account
                    </label>
                    <Select
                      value={selectedAccount}
                      onChange={(e) => setSelectedAccount(e.target.value)}
                      disabled={loading}
                    >
                      <option value="all">All Accounts</option>
                      {accounts.map((account) => (
                        <option key={account.id} value={account.id}>
                          {account.name}
                        </option>
                      ))}
                    </Select>
                  </div>

                  {/* Date Range */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">
                        Start Date
                      </label>
                      <Input
                        type="date"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">
                        End Date
                      </label>
                      <Input
                        type="date"
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                      />
                    </div>
                  </div>
                </div>
              </CardContent>
            </MotionCard>

            {/* Export Button */}
            <MotionCard transition={{ delay: 0.3 }}>
              <CardContent className="p-6">
                <Button
                  onClick={handleExport}
                  disabled={exporting}
                  variant="bloom"
                  size="lg"
                  className="w-full"
                  pill
                >
                  {exporting ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Harvesting...
                    </>
                  ) : (
                    <>
                      <Icon name="download" size={20} />
                      Export {exportFormat.toUpperCase()}
                    </>
                  )}
                </Button>
              </CardContent>
            </MotionCard>

            {/* Info Card */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
            >
              <Card className="bg-growth-pale/50 border-growth/20">
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    <div className="p-3 bg-growth/10 rounded-2xl">
                      <Icon name="tip" size={24} className="text-growth" />
                    </div>
                    <div>
                      <h3 className="font-display font-bold text-foreground mb-2">
                        What's included in your harvest?
                      </h3>
                      <ul className="text-sm text-text-secondary space-y-1.5">
                        <li className="flex items-center gap-2">
                          <Icon name="check" size={14} className="text-growth" />
                          Date, description, and amount
                        </li>
                        <li className="flex items-center gap-2">
                          <Icon name="check" size={14} className="text-growth" />
                          Category and account information
                        </li>
                        <li className="flex items-center gap-2">
                          <Icon name="check" size={14} className="text-growth" />
                          Transaction type (income/expense)
                        </li>
                        {exportFormat === "excel" && (
                          <li className="flex items-center gap-2">
                            <Icon name="check" size={14} className="text-growth" />
                            Formatted with colors and totals
                          </li>
                        )}
                      </ul>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </main>
      </div>
    </>
  );
}
