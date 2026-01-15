"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalTitle,
  ModalBody,
  ModalFooter,
} from "@/components/ui/Modal";
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

  const createCategory = useMutation(api.categories.create);
  const updateCategory = useMutation(api.categories.update);

  const isEdit = !!category;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      showError("Please enter a category name");
      return;
    }

    setIsLoading(true);

    try {
      if (isEdit) {
        await updateCategory({
          id: category.id as Id<"categories">,
          name,
          color,
          icon,
        });
      } else {
        await createCategory({
          name,
          color,
          icon,
        });
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
    <Modal open={true} onOpenChange={(open) => !open && onClose()}>
      <ModalContent size="md">
        <ModalHeader>
          <ModalTitle>{isEdit ? "Edit Category" : "New Category"}</ModalTitle>
        </ModalHeader>

        <form onSubmit={handleSubmit}>
          <ModalBody className="space-y-6">
            {/* Name Input */}
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-2">
                Category Name
              </label>
              <Input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Coffee Shops"
                disabled={isLoading}
                autoFocus
              />
            </div>

            {/* Icon Selector */}
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-3">
                Icon
              </label>
              <div className="grid grid-cols-6 gap-2">
                {ICON_OPTIONS.map((iconName) => (
                  <button
                    key={iconName}
                    type="button"
                    onClick={() => setIcon(iconName)}
                    disabled={isLoading}
                    className={`p-3 rounded-xl border-2 transition-all hover:scale-110 flex items-center justify-center disabled:opacity-50 ${
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
              <label className="block text-sm font-medium text-text-secondary mb-3">
                Color
              </label>
              <div className="grid grid-cols-6 gap-2 mb-3">
                {COLOR_PRESETS.map((presetColor) => (
                  <button
                    key={presetColor}
                    type="button"
                    onClick={() => setColor(presetColor)}
                    disabled={isLoading}
                    className={`h-10 rounded-xl border-2 transition-all hover:scale-110 disabled:opacity-50 ${
                      color === presetColor
                        ? "border-foreground ring-2 ring-primary"
                        : "border-border"
                    }`}
                    style={{ backgroundColor: presetColor }}
                  />
                ))}
              </div>
              <Input
                type="color"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                disabled={isLoading}
                className="h-10 cursor-pointer"
              />
            </div>

            {/* Preview */}
            <div className="bg-sand/50 border border-border rounded-2xl p-4">
              <p className="text-sm text-text-secondary mb-2">Preview</p>
              <div className="flex items-center gap-3">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center"
                  style={{ backgroundColor: `${color}20`, color }}
                >
                  <Icon name={icon as IconName} size={24} />
                </div>
                <span className="text-foreground font-medium">
                  {name || "Category Name"}
                </span>
              </div>
            </div>
          </ModalBody>

          <ModalFooter>
            <Button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              variant="ghost"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isLoading || !name.trim()}
              isLoading={isLoading}
              variant="bloom"
            >
              {isEdit ? "Update" : "Create"}
            </Button>
          </ModalFooter>
        </form>
      </ModalContent>
    </Modal>
  );
}
