"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useRouter } from "next/navigation";
import Icon from "@/components/icons/Icon";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

interface SearchResult {
  id: string;
  type: "transaction" | "account" | "category";
  title: string;
  subtitle: string;
  amount?: number;
  icon?: string;
  color?: string;
}

export default function GlobalSearch() {
  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  // Only fetch data when search is open
  const transactionsData = useQuery(
    api.transactions.list,
    isOpen ? { search: query.trim().length >= 2 ? query.trim() : undefined, limit: 5 } : "skip"
  );
  const accounts = useQuery(api.accounts.list, isOpen ? {} : "skip");
  const categories = useQuery(api.categories.list, isOpen ? {} : "skip");

  const loading = isOpen && (transactionsData === undefined || accounts === undefined || categories === undefined);

  // Compute search results
  const results = useMemo(() => {
    if (query.trim().length < 2) return [];

    const searchLower = query.trim().toLowerCase();
    const allResults: SearchResult[] = [];

    // Format transactions (already filtered by search query in Convex)
    transactionsData?.transactions?.forEach((t) => {
      allResults.push({
        id: t._id,
        type: "transaction",
        title: t.description,
        subtitle: new Date(t.date).toLocaleDateString(),
        amount: t.amount,
        icon: t.category?.icon || "other",
        color: t.category?.color,
      });
    });

    // Filter and format accounts
    accounts
      ?.filter((a) => a.name.toLowerCase().includes(searchLower))
      .slice(0, 5)
      .forEach((a) => {
        allResults.push({
          id: a._id,
          type: "account",
          title: a.name,
          subtitle: a.type,
          icon: "accounts",
        });
      });

    // Filter and format categories
    categories
      ?.filter((c) => c.name.toLowerCase().includes(searchLower))
      .slice(0, 5)
      .forEach((c) => {
        allResults.push({
          id: c._id,
          type: "category",
          title: c.name,
          subtitle: "Category",
          icon: c.icon,
          color: c.color,
        });
      });

    return allResults;
  }, [query, transactionsData, accounts, categories]);

  useEffect(() => {
    // Keyboard shortcut: / to focus search
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "/" && !isOpen) {
        e.preventDefault();
        setIsOpen(true);
        setTimeout(() => inputRef.current?.focus(), 100);
      }
      if (e.key === "Escape" && isOpen) {
        setIsOpen(false);
        setQuery("");
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen]);

  const handleResultClick = (result: SearchResult) => {
    setIsOpen(false);
    setQuery("");

    if (result.type === "transaction") {
      router.push("/transactions");
    } else if (result.type === "account") {
      router.push(`/accounts/${result.id}`);
    } else if (result.type === "category") {
      router.push("/categories");
    }
  };

  if (!isOpen) {
    return (
      <Button
        onClick={() => setIsOpen(true)}
        variant="ghost"
        className="flex items-center gap-2 px-4 py-2 border border-border hover:bg-surface-alt text-muted"
      >
        <Icon name="search" size={18} />
        <span className="text-sm hidden sm:inline">Search...</span>
        <kbd className="hidden sm:inline-block px-2 py-0.5 text-xs bg-surface-alt border border-border rounded">
          /
        </kbd>
      </Button>
    );
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
        onClick={() => {
          setIsOpen(false);
          setQuery("");
        }}
      />

      {/* Search Modal */}
      <div className="fixed top-20 left-1/2 -translate-x-1/2 w-full max-w-2xl z-50 px-4">
        <Card variant="glass" className="overflow-hidden">
          {/* Search Input */}
          <div className="flex items-center gap-3 p-4 border-b border-border">
            <Icon name="search" size={20} className="text-muted" />
            <Input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search transactions, accounts, categories..."
              className="flex-1 bg-transparent border-none outline-none text-foreground placeholder-muted focus:ring-0"
              autoFocus
            />
            {loading && (
              <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            )}
          </div>

          {/* Results */}
          <div className="max-h-96 overflow-y-auto">
            {results.length === 0 && query.trim().length >= 2 && !loading && (
              <div className="p-8 text-center text-muted">
                <Icon
                  name="search"
                  size={32}
                  className="mx-auto mb-2 opacity-50"
                />
                <p>No results found</p>
              </div>
            )}

            {results.length === 0 && query.trim().length < 2 && (
              <div className="p-8 text-center text-muted">
                <p className="text-sm">Type at least 2 characters to search</p>
              </div>
            )}

            {results.map((result) => (
              <Button
                key={`${result.type}-${result.id}`}
                onClick={() => handleResultClick(result)}
                variant="ghost"
                className="w-full flex items-center gap-4 p-4 hover:bg-surface-alt text-left border-b border-border last:border-0 h-auto rounded-none"
              >
                <div
                  className="w-10 h-10 rounded-lg flex items-center justify-center"
                  style={{
                    backgroundColor: result.color
                      ? `${result.color}15`
                      : "var(--surface-alt)",
                    color: result.color || "var(--foreground)",
                  }}
                >
                  <Icon name={(result.icon as any) || "other"} size={20} />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="font-medium text-foreground truncate">
                    {result.title}
                  </div>
                  <div className="text-sm text-muted">{result.subtitle}</div>
                </div>

                {result.amount !== undefined && (
                  <div
                    className={`font-semibold ${result.amount > 0 ? "text-success" : "text-foreground"}`}
                  >
                    {result.amount > 0 ? "+" : ""}€{result.amount.toFixed(2)}
                  </div>
                )}

                <div className="text-xs px-2 py-1 bg-surface rounded text-muted capitalize">
                  {result.type}
                </div>
              </Button>
            ))}
          </div>

          {/* Footer */}
          <div className="px-4 py-3 bg-surface border-t border-border flex items-center justify-between text-xs text-muted">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1">
                <kbd className="px-2 py-0.5 bg-background border border-border rounded">
                  ↑
                </kbd>
                <kbd className="px-2 py-0.5 bg-background border border-border rounded">
                  ↓
                </kbd>
                <span>Navigate</span>
              </div>
              <div className="flex items-center gap-1">
                <kbd className="px-2 py-0.5 bg-background border border-border rounded">
                  ↵
                </kbd>
                <span>Select</span>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <kbd className="px-2 py-0.5 bg-background border border-border rounded">
                Esc
              </kbd>
              <span>Close</span>
            </div>
          </div>
        </Card>
      </div>
    </>
  );
}
