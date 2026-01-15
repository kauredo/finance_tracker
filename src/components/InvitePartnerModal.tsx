"use client";

import { useState, useEffect } from "react";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalTitle,
  ModalBody,
} from "@/components/ui/Modal";
import Icon from "@/components/icons/Icon";

interface InvitePartnerModalProps {
  onClose: () => void;
}

export default function InvitePartnerModal({
  onClose,
}: InvitePartnerModalProps) {
  const [copied, setCopied] = useState(false);
  const [inviteLink, setInviteLink] = useState("");

  // Fetch household from Convex - user can only be in one household
  const household = useQuery(api.households.getCurrentHousehold);
  const loading = household === undefined;

  // Check if user is owner
  const currentUserRole = household?.members?.find(
    (m) => m.role === "owner",
  )?.role;
  const isOwner = currentUserRole === "owner";

  useEffect(() => {
    if (household?._id && typeof window !== "undefined") {
      setInviteLink(
        `${window.location.origin}/join?household=${household._id}`,
      );
    }
  }, [household]);

  const handleCopyLink = () => {
    navigator.clipboard.writeText(inviteLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Modal open={true} onOpenChange={(open) => !open && onClose()}>
      <ModalContent size="sm">
        <ModalHeader>
          <ModalTitle>Invite Partner</ModalTitle>
        </ModalHeader>

        <ModalBody>
          {loading ? (
            <div className="text-center py-8 text-text-secondary">
              Loading...
            </div>
          ) : !household ? (
            <div className="text-center py-8">
              <p className="text-text-secondary mb-4">
                You don't have any joint accounts yet.
              </p>
              <p className="text-sm text-text-secondary">
                Create a joint account first to invite your partner!
              </p>
            </div>
          ) : !isOwner ? (
            <div className="text-center py-8">
              <p className="text-text-secondary mb-4">
                Only household owners can invite new members.
              </p>
            </div>
          ) : (
            <>
              <p className="text-foreground text-sm mb-6">
                Share this link with your partner so they can join your household
                and access joint accounts.
              </p>

              <div className="space-y-4">
                {/* Share Link */}
                <div>
                  <label className="block text-foreground text-sm font-medium mb-2">
                    Invitation Link
                  </label>
                  <div className="flex gap-2">
                    <Input
                      type="text"
                      value={inviteLink}
                      readOnly
                      className="flex-1 select-all"
                      onClick={(e) => e.currentTarget.select()}
                    />
                    <Button onClick={handleCopyLink} variant="secondary">
                      {copied ? "Copied!" : "Copy"}
                    </Button>
                  </div>
                  <p className="text-xs text-text-secondary mt-2">
                    <Icon name="tip" size={12} className="mr-1 inline-block" />
                    Share via WhatsApp, email, or any messaging app
                  </p>
                </div>
              </div>
            </>
          )}
        </ModalBody>
      </ModalContent>
    </Modal>
  );
}
