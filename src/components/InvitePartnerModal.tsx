"use client";

import { useState, useEffect } from "react";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
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
    (m) => m.role === "owner"
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
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <Card variant="glass" className="w-full max-w-md">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-foreground">Invite Partner</h2>
          <Button
            onClick={onClose}
            variant="ghost"
            size="sm"
            className="text-muted hover:text-foreground text-2xl"
          >
            ✕
          </Button>
        </div>

        {loading ? (
          <div className="text-center py-8 text-muted">Loading...</div>
        ) : !household ? (
          <div className="text-center py-8">
            <p className="text-muted mb-4">
              You don't have any joint accounts yet.
            </p>
            <p className="text-sm text-text-secondary">
              Create a joint account first to invite your partner!
            </p>
          </div>
        ) : !isOwner ? (
          <div className="text-center py-8">
            <p className="text-muted mb-4">
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
                <p className="text-xs text-muted mt-2">
                  <Icon name="tip" size={12} className="mr-1 inline-block" />
                  Share via WhatsApp, email, or any messaging app
                </p>
              </div>
            </div>
          </>
        )}
      </Card>
    </div>
  );
}
