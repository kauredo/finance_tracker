"use client";

import { useState } from "react";
import { Card } from "@/components/ui/Card";
import { useToast } from "@/contexts/ToastContext";
import Icon, { IconName } from "@/components/icons/Icon";

interface CategoryModalProps {
  category?: {
    id: string;
    name: string;
    color: string;
    icon: string;
  };
  onClose: () => void;
  onSuccess: () => void;
}

const ICON_OPTIONS = [
  "groceries",
  "dining",
  "transport",
  "utilities",
  "entertainment",
  "shopping",
  "healthcare",
  "income",
  "other",
  "personal",
  "joint",
];

const COLOR_PRESETS = [
  "#10b981", // green
  "#f59e0b", // amber
  "#3b82f6", // blue
  "#8b5cf6", // purple
  "#ec4899", // pink
  "#f43f5e", // rose
  "#06b6d4", // cyan
  "#22c55e", // green
  "#6b7280", // gray
  "#ef4444", // red
  "#f97316", // orange
  "#eab308", // yellow
];

export default function CategoryModal({
  category,
  onClose,
  onSuccess,
}: CategoryModalProps) {
  const { error: showError, success: showSuccess } = useToast();
  const [name, setName] = useState(category?.name || "");
  const [color, setColor] = useState(category?.color || "#6b7280");
  const [icon, setIcon] = useState(category?.icon || "other");
  const [isLoading, setIsLoading] = useState(false);

  const isEdit = !!category;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      showError("Please enter a category name");
      return;
    }

    setIsLoading(true);

    try {
      const url = isEdit ? `/api/categories/${category.id}` : "/api/categories";

      const method = isEdit ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, color, icon }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to save category");
      }

      showSuccess(`Category ${isEdit ? "updated" : "created"} successfully`);
      onSuccess();
    } catch (error) {
      console.error("Error saving category:", error);
      showError(
        error instanceof Error ? error.message : "Failed to save category",
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <Card variant="glass" className="w-full max-w-md">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-foreground">
            {isEdit ? "Edit Category" : "New Category"}
          </h2>
          <button
            onClick={onClose}
            disabled={isLoading}
            className="text-muted hover:text-foreground text-2xl disabled:opacity-50"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Name Input */}
          <div>
            <label className="block text-sm font-medium text-muted mb-2">
              Category Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Coffee Shops"
              disabled={isLoading}
              className="w-full px-4 py-3 bg-surface border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-foreground disabled:opacity-50"
              autoFocus
            />
          </div>

          {/* Icon Selector */}
          <div>
            <label className="block text-sm font-medium text-muted mb-3">
              Icon
            </label>
            <div className="grid grid-cols-6 gap-2">
              {ICON_OPTIONS.map((iconName) => (
                <button
                  key={iconName}
                  type="button"
                  onClick={() => setIcon(iconName)}
                  disabled={isLoading}
                  className={`p-3 rounded-lg border-2 transition-all hover:scale-110 disabled:opacity-50 flex items-center justify-center ${
                    icon === iconName
                      ? "border-primary bg-primary/10"
                      : "border-border bg-surface hover:border-primary/50"
                  }`}
                >
                  <Icon name={iconName as IconName} size={24} />
                </button>
              ))}
            </div>
          </div>

          {/* Color Selector */}
          <div>
            <label className="block text-sm font-medium text-muted mb-3">
              Color
            </label>
            <div className="grid grid-cols-6 gap-2 mb-3">
              {COLOR_PRESETS.map((presetColor) => (
                <button
                  key={presetColor}
                  type="button"
                  onClick={() => setColor(presetColor)}
                  disabled={isLoading}
                  className={`h-10 rounded-lg border-2 transition-all hover:scale-110 disabled:opacity-50 ${
                    color === presetColor
                      ? "border-foreground ring-2 ring-primary"
                      : "border-border"
                  }`}
                  style={{ backgroundColor: presetColor }}
                />
              ))}
            </div>
            <input
              type="color"
              value={color}
              onChange={(e) => setColor(e.target.value)}
              disabled={isLoading}
              className="w-full h-10 rounded-lg border border-border cursor-pointer disabled:opacity-50"
            />
          </div>

          {/* Preview */}
          <div className="bg-surface-alt border border-border rounded-lg p-4">
            <p className="text-sm text-muted mb-2">Preview</p>
            <div className="flex items-center gap-3">
              <div
                className="w-10 h-10 rounded-lg flex items-center justify-center"
                style={{ backgroundColor: `${color}20`, color }}
              >
                <Icon name={icon as IconName} size={24} />
              </div>
              <span className="text-foreground font-medium">
                {name || "Category Name"}
              </span>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              className="flex-1 px-4 py-3 bg-surface hover:bg-surface-alt text-foreground rounded-lg transition-all border border-border disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading || !name.trim()}
              className="flex-1 bg-primary text-white font-bold py-3 rounded-lg hover:bg-primary/90 transition-all shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? "Saving..." : isEdit ? "Update" : "Create"}
            </button>
          </div>
        </form>
      </Card>
    </div>
  );
}
