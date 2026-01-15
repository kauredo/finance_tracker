"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import { Button } from "@/components/ui/Button";
import { Input, Select } from "@/components/ui/Input";
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalTitle,
  ModalBody,
  ModalFooter,
} from "@/components/ui/Modal";

type AccountType = "checking" | "savings" | "credit" | "personal" | "joint";

interface Account {
  _id: Id<"accounts">;
  name: string;
  type: AccountType;
}

interface EditAccountModalProps {
  account: Account;
  onClose: () => void;
  onSuccess: () => void;
}

export default function EditAccountModal({
  account,
  onClose,
  onSuccess,
}: EditAccountModalProps) {
  const [name, setName] = useState(account.name);
  const [type, setType] = useState<AccountType>(account.type);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const updateAccount = useMutation(api.accounts.update);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!name.trim()) {
      setError("Account name is required");
      return;
    }

    setLoading(true);

    try {
      await updateAccount({
        id: account._id,
        name: name.trim(),
        type,
      });

      onSuccess();
    } catch (err: any) {
      setError(err.message || "Failed to update account");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal open={true} onOpenChange={(open) => !open && onClose()}>
      <ModalContent size="sm">
        <ModalHeader>
          <ModalTitle>Edit Account</ModalTitle>
        </ModalHeader>

        <form onSubmit={handleSubmit}>
          <ModalBody className="space-y-4">
            {error && (
              <div className="p-3 rounded-xl bg-danger/10 border border-danger/20 text-danger text-sm">
                {error}
              </div>
            )}

            <div>
              <label
                htmlFor="name"
                className="block text-sm font-medium text-foreground mb-2"
              >
                Account Name
              </label>
              <Input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Main Checking"
                required
                autoFocus
              />
            </div>

            <div>
              <label
                htmlFor="type"
                className="block text-sm font-medium text-foreground mb-2"
              >
                Account Type
              </label>
              <Select
                id="type"
                value={type}
                onChange={(e) => setType(e.target.value as AccountType)}
              >
                <option value="checking">Checking</option>
                <option value="savings">Savings</option>
                <option value="credit">Credit</option>
                <option value="personal">Personal</option>
                <option value="joint">Joint</option>
              </Select>
            </div>
          </ModalBody>

          <ModalFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={onClose}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading}
              isLoading={loading}
              variant="bloom"
            >
              Save Changes
            </Button>
          </ModalFooter>
        </form>
      </ModalContent>
    </Modal>
  );
}
