"use client";

import { useState, useEffect } from "react";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/contexts/ToastContext";
import NavBar from "@/components/NavBar";
import { Card, CardContent, MotionCard } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Select, Input } from "@/components/ui/Input";
import Icon from "@/components/icons/Icon";
import Image from "next/image";
import { format } from "date-fns";
import { motion } from "motion/react";
import { useCurrency } from "@/hooks/useCurrency";

const exportFormats = [
  {
    id: "csv",
    name: "CSV",
    emoji: "📄",
    description: "Spreadsheet compatible",
    subtitle: "Works in Excel, Google Sheets, etc.",
  },
  {
    id: "pdf",
    name: "PDF",
    emoji: "📋",
    description: "Professional report",
    subtitle: "Summary stats & formatted tables",
  },
];

export default function DataExportPage() {
  const { user, loading: authLoading } = useAuth();
  const { error: showError, success: showSuccess } = useToast();
  const [exporting, setExporting] = useState(false);

  // Filters
  const [selectedAccount, setSelectedAccount] = useState<string>("all");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>(
    format(new Date(), "yyyy-MM-dd"),
  );
  const [exportFormat, setExportFormat] = useState<"csv" | "pdf">("csv");
  const { formatAmount } = useCurrency();

  // Fetch accounts from Convex
  const accounts = useQuery(api.accounts.list);
  const loading = accounts === undefined;

  // Fetch transactions for export
  const transactionsData = useQuery(api.transactions.list, {
    accountId:
      selectedAccount !== "all"
        ? (selectedAccount as Id<"accounts">)
        : undefined,
    dateFrom: startDate || undefined,
    dateTo: endDate || undefined,
    limit: 10000, // Get all transactions for export
  });

  const downloadFile = (blob: Blob, filename: string) => {
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  const exportCSV = () => {
    const transactions = transactionsData!.transactions;
    const headers = [
      "Date",
      "Description",
      "Amount",
      "Category",
      "Account",
      "Type",
    ];
    const rows = transactions.map((tx) => [
      tx.date,
      `"${tx.description.replace(/"/g, '""')}"`,
      tx.amount.toFixed(2),
      tx.category?.name || "Uncategorized",
      tx.account?.name || "Unknown",
      tx.amount >= 0 ? "Income" : "Expense",
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map((row) => row.join(",")),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    downloadFile(blob, `transactions_${format(new Date(), "yyyy-MM-dd")}.csv`);
  };

  const exportPDF = async () => {
    const { default: jsPDF } = await import("jspdf");
    const { default: autoTable } = await import("jspdf-autotable");

    const transactions = transactionsData!.transactions;
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();

    // Colors (warm palette matching the app)
    const primary: [number, number, number] = [255, 143, 171]; // #ff8fab pink
    const textDark: [number, number, number] = [45, 40, 35];
    const textMuted: [number, number, number] = [120, 110, 100];
    const bgWarm: [number, number, number] = [252, 248, 243];

    // --- Header ---
    doc.setFillColor(...bgWarm);
    doc.rect(0, 0, pageWidth, 40, "F");
    doc.setFontSize(22);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...textDark);
    doc.text("Wallet Joy", 20, 18);
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...textMuted);
    const dateRange = [
      startDate ? format(new Date(startDate), "MMM d, yyyy") : "All time",
      endDate ? format(new Date(endDate), "MMM d, yyyy") : "Present",
    ].join(" — ");
    const accountLabel =
      selectedAccount === "all"
        ? "All Accounts"
        : (accounts?.find((a) => a._id === selectedAccount)?.name ?? "");
    doc.text(`${dateRange}  •  ${accountLabel}`, 20, 26);
    doc.text(
      `Exported ${format(new Date(), "MMM d, yyyy 'at' h:mm a")}`,
      20,
      32,
    );

    // --- Summary Stats ---
    const totalIncome = transactions
      .filter((tx) => tx.amount > 0)
      .reduce((sum, tx) => sum + tx.amount, 0);
    const totalExpenses = transactions
      .filter((tx) => tx.amount < 0)
      .reduce((sum, tx) => sum + Math.abs(tx.amount), 0);
    const netAmount = totalIncome - totalExpenses;

    let y = 50;
    doc.setFillColor(...primary);
    doc.rect(20, y, pageWidth - 40, 0.5, "F");
    y += 8;

    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...textDark);
    doc.text("Summary", 20, y);
    y += 8;

    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    const summaryItems = [
      ["Transactions", `${transactions.length}`],
      ["Total Income", formatAmount(totalIncome)],
      ["Total Expenses", formatAmount(totalExpenses)],
      ["Net", formatAmount(netAmount)],
    ];
    const colWidth = (pageWidth - 40) / summaryItems.length;
    summaryItems.forEach(([label, value], i) => {
      const x = 20 + i * colWidth;
      doc.setTextColor(...textMuted);
      doc.text(label, x, y);
      doc.setTextColor(...textDark);
      doc.setFont("helvetica", "bold");
      doc.text(value, x, y + 5);
      doc.setFont("helvetica", "normal");
    });
    y += 16;

    // --- Category Breakdown ---
    const categoryMap = new Map<
      string,
      { amount: number; count: number }
    >();
    transactions
      .filter((tx) => tx.amount < 0)
      .forEach((tx) => {
        const cat = tx.category?.name || "Uncategorized";
        const prev = categoryMap.get(cat) || { amount: 0, count: 0 };
        categoryMap.set(cat, {
          amount: prev.amount + Math.abs(tx.amount),
          count: prev.count + 1,
        });
      });

    if (categoryMap.size > 0) {
      const categoryRows = [...categoryMap.entries()]
        .sort((a, b) => b[1].amount - a[1].amount)
        .map(([name, { amount, count }]) => [
          name,
          `${count}`,
          formatAmount(amount),
          `${((amount / totalExpenses) * 100).toFixed(1)}%`,
        ]);

      doc.setFontSize(11);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(...textDark);
      doc.text("Spending by Category", 20, y);
      y += 2;

      autoTable(doc, {
        startY: y,
        head: [["Category", "Count", "Amount", "% of Total"]],
        body: categoryRows,
        margin: { left: 20, right: 20 },
        theme: "plain",
        headStyles: {
          fillColor: bgWarm,
          textColor: textMuted,
          fontSize: 8,
          fontStyle: "bold",
          cellPadding: 3,
        },
        bodyStyles: {
          textColor: textDark,
          fontSize: 8,
          cellPadding: 3,
        },
        alternateRowStyles: { fillColor: [250, 247, 242] },
        columnStyles: {
          2: { halign: "right" },
          3: { halign: "right" },
        },
      });
      y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 12;
    }

    // --- Transactions Table ---
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...textDark);
    doc.text("Transactions", 20, y);
    y += 2;

    const txRows = transactions.map((tx) => [
      tx.date,
      tx.description,
      tx.category?.name || "—",
      tx.account?.name || "—",
      `${tx.amount >= 0 ? "+" : ""}${formatAmount(Math.abs(tx.amount))}`,
    ]);

    autoTable(doc, {
      startY: y,
      head: [["Date", "Description", "Category", "Account", "Amount"]],
      body: txRows,
      margin: { left: 20, right: 20 },
      theme: "plain",
      headStyles: {
        fillColor: bgWarm,
        textColor: textMuted,
        fontSize: 8,
        fontStyle: "bold",
        cellPadding: 3,
      },
      bodyStyles: {
        textColor: textDark,
        fontSize: 7.5,
        cellPadding: 2.5,
      },
      alternateRowStyles: { fillColor: [250, 247, 242] },
      columnStyles: {
        0: { cellWidth: 22 },
        4: { halign: "right" },
      },
      didParseCell: (data) => {
        if (data.section === "body" && data.column.index === 4) {
          const raw = transactions[data.row.index];
          if (raw && raw.amount >= 0) {
            data.cell.styles.textColor = [56, 120, 72];
          }
        }
      },
    });

    // --- Footer on every page ---
    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      const pageHeight = doc.internal.pageSize.getHeight();
      doc.setFontSize(7);
      doc.setTextColor(...textMuted);
      doc.text(
        `Page ${i} of ${pageCount}`,
        pageWidth / 2,
        pageHeight - 10,
        { align: "center" },
      );
    }

    doc.save(`wallet-joy-report_${format(new Date(), "yyyy-MM-dd")}.pdf`);
  };

  const handleExport = async () => {
    if (!transactionsData?.transactions) {
      showError("No data to export");
      return;
    }

    setExporting(true);
    try {
      if (exportFormat === "pdf") {
        await exportPDF();
      } else {
        exportCSV();
      }
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
                      onClick={() => setExportFormat(format.id as "csv" | "pdf")}
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
                              <Icon
                                name="check"
                                size={14}
                                className="text-white"
                              />
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
                      {accounts?.map((account) => (
                        <option key={account._id} value={account._id}>
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
                          <Icon
                            name="check"
                            size={14}
                            className="text-growth"
                          />
                          Date, description, and amount
                        </li>
                        <li className="flex items-center gap-2">
                          <Icon
                            name="check"
                            size={14}
                            className="text-growth"
                          />
                          Category and account information
                        </li>
                        <li className="flex items-center gap-2">
                          <Icon
                            name="check"
                            size={14}
                            className="text-growth"
                          />
                          Transaction type (income/expense)
                        </li>
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
