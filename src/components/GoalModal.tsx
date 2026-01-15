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

interface Goal {
  _id: Id<"goals">;
  name: string;
  targetAmount: number;
  currentAmount: number;
  targetDate?: string;
  color?: string;
  icon?: string;
}

interface GoalModalProps {
  goal?: Goal;
  onClose: () => void;
  onSuccess: () => void;
}

const ICON_OPTIONS = [
  "savings",
  "car",
  "home",
  "vacation",
  "emergency",
  "education",
  "investment",
  "gift",
  "electronics",
  "other",
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
];

export default function GoalModal({
  goal,
  onClose,
  onSuccess,
}: GoalModalProps) {
  const { error: showError, success: showSuccess } = useToast();
  const [loading, setLoading] = useState(false);

  // Convex mutations
  const createGoal = useMutation(api.goals.create);
  const updateGoal = useMutation(api.goals.update);

  const [formData, setFormData] = useState<{
    name: string;
    targetAmount: string | number;
    currentAmount: string | number;
    targetDate: string;
    color: string;
    icon: string;
  }>({
    name: goal?.name || "",
    targetAmount: goal?.targetAmount || "",
    currentAmount: goal?.currentAmount || 0,
    targetDate: goal?.targetDate || "",
    color: goal?.color || "#10b981",
    icon: goal?.icon || "savings",
  });

  const isEdit = !!goal;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name || !formData.targetAmount) {
      showError("Please fill in required fields");
      return;
    }

    setLoading(true);
    try {
      if (isEdit) {
        await updateGoal({
          id: goal._id,
          name: formData.name,
          targetAmount: Number(formData.targetAmount),
          currentAmount: Number(formData.currentAmount),
          targetDate: formData.targetDate || undefined,
          color: formData.color,
          icon: formData.icon,
        });
      } else {
        await createGoal({
          name: formData.name,
          targetAmount: Number(formData.targetAmount),
          currentAmount: Number(formData.currentAmount),
          targetDate: formData.targetDate || undefined,
          color: formData.color,
          icon: formData.icon,
        });
      }

      showSuccess(`Goal ${isEdit ? "updated" : "created"} successfully`);
      onSuccess();
    } catch (error) {
      console.error("Error saving goal:", error);
      showError(error instanceof Error ? error.message : "Failed to save goal");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal open={true} onOpenChange={(open) => !open && onClose()}>
      <ModalContent size="md">
        <ModalHeader>
          <ModalTitle>{isEdit ? "Edit Goal" : "New Savings Goal"}</ModalTitle>
        </ModalHeader>

        <form onSubmit={handleSubmit}>
          <ModalBody className="space-y-6 max-h-[60vh] overflow-y-auto">
            {/* Name */}
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-2">
                Goal Name *
              </label>
              <Input
                type="text"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                placeholder="e.g., New Car"
                required
                autoFocus
              />
            </div>

            {/* Amounts */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-2">
                  Target Amount *
                </label>
                <Input
                  type="number"
                  value={formData.targetAmount}
                  onChange={(e) =>
                    setFormData({ ...formData, targetAmount: e.target.value })
                  }
                  placeholder="0.00"
                  min="0"
                  step="0.01"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-2">
                  Current Saved
                </label>
                <Input
                  type="number"
                  value={formData.currentAmount}
                  onChange={(e) =>
                    setFormData({ ...formData, currentAmount: e.target.value })
                  }
                  placeholder="0.00"
                  min="0"
                  step="0.01"
                />
              </div>
            </div>

            {/* Target Date */}
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-2">
                Target Date (Optional)
              </label>
              <Input
                type="date"
                value={formData.targetDate || ""}
                onChange={(e) =>
                  setFormData({ ...formData, targetDate: e.target.value })
                }
              />
            </div>

            {/* Icon */}
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-3">
                Icon
              </label>
              <div className="grid grid-cols-5 gap-2">
                {ICON_OPTIONS.map((iconName) => (
                  <button
                    key={iconName}
                    type="button"
                    onClick={() => setFormData({ ...formData, icon: iconName })}
                    className={`p-3 rounded-xl border-2 transition-all hover:scale-110 ${
                      formData.icon === iconName
                        ? "border-primary bg-primary/10"
                        : "border-border bg-surface hover:border-primary/50"
                    }`}
                  >
                    <Icon name={iconName as IconName} size={24} />
                  </button>
                ))}
              </div>
            </div>

            {/* Color */}
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-3">
                Color
              </label>
              <div className="grid grid-cols-5 gap-2">
                {COLOR_PRESETS.map((color) => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => setFormData({ ...formData, color })}
                    className={`h-10 rounded-xl border-2 transition-all hover:scale-110 ${
                      formData.color === color
                        ? "border-foreground ring-2 ring-primary"
                        : "border-border"
                    }`}
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
            </div>
          </ModalBody>

          <ModalFooter>
            <Button
              type="button"
              onClick={onClose}
              disabled={loading}
              variant="ghost"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading}
              isLoading={loading}
              variant="bloom"
            >
              {isEdit ? "Update Goal" : "Create Goal"}
            </Button>
          </ModalFooter>
        </form>
      </ModalContent>
    </Modal>
  );
}
