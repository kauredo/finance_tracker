"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation } from "convex/react";
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
  const [inviteCode, setInviteCode] = useState("");
  const [expiresAt, setExpiresAt] = useState<number | null>(null);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch household from Convex
  const household = useQuery(api.households.getCurrentHousehold);
  const createInvite = useMutation(api.households.createInvite);
  const loading = household === undefined;

  // Check if user is owner
  const currentUserRole = household?.members?.find(
    (m) => m.role === "owner",
  )?.role;
  const isOwner = currentUserRole === "owner";

  // Generate invite when modal opens
  useEffect(() => {
    if (household?._id && isOwner && !inviteCode) {
      generateInvite();
    }
  }, [household, isOwner]);

  const generateInvite = async () => {
    setGenerating(true);
    setError(null);

    try {
      const result = await createInvite();
      setInviteCode(result.inviteCode);
      setExpiresAt(result.expiresAt);

      if (typeof window !== "undefined") {
        setInviteLink(`${window.location.origin}/join?code=${result.inviteCode}`);
      }
    } catch (err: any) {
      setError(err.message || "Failed to generate invite");
    } finally {
      setGenerating(false);
    }
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(inviteLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText(inviteCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const formatExpiryDate = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString(undefined, {
      weekday: "short",
      month: "short",
      day: "numeric",
    });
  };

  return (
    <Modal open={true} onOpenChange={(open) => !open && onClose()}>
      <ModalContent size="sm">
        <ModalHeader>
          <ModalTitle>Invite Partner</ModalTitle>
        </ModalHeader>

        <ModalBody>
          {loading || generating ? (
            <div className="text-center py-8">
              <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-primary-pale flex items-center justify-center">
                <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full" />
              </div>
              <p className="text-text-secondary">
                {generating ? "Generating invite..." : "Loading..."}
              </p>
            </div>
          ) : error ? (
            <div className="text-center py-8">
              <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-danger/10 flex items-center justify-center">
                <Icon name="close" size={24} className="text-danger" />
              </div>
              <p className="text-text-secondary mb-4">{error}</p>
              <Button variant="secondary" onClick={generateInvite}>
                Try Again
              </Button>
            </div>
          ) : !household ? (
            <div className="text-center py-8">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-warning-light flex items-center justify-center">
                <span className="text-3xl">🏠</span>
              </div>
              <p className="text-foreground font-medium mb-2">
                No household yet
              </p>
              <p className="text-sm text-text-secondary">
                Create a joint account first to start a household and invite
                your partner!
              </p>
            </div>
          ) : !isOwner ? (
            <div className="text-center py-8">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-sand flex items-center justify-center">
                <Icon name="user" size={32} className="text-text-secondary" />
              </div>
              <p className="text-foreground font-medium mb-2">
                Owner access required
              </p>
              <p className="text-sm text-text-secondary">
                Only household owners can invite new members.
              </p>
            </div>
          ) : (
            <>
              <p className="text-foreground text-sm mb-6">
                Share this invite with your partner so they can join your
                household and access joint accounts.
              </p>

              <div className="space-y-4">
                {/* Invite Code */}
                <div className="bg-primary-pale/50 rounded-2xl p-4 text-center">
                  <p className="text-xs text-text-secondary mb-2">Invite Code</p>
                  <button
                    onClick={handleCopyCode}
                    className="text-2xl font-mono font-bold text-primary tracking-widest hover:opacity-80 transition-opacity"
                  >
                    {inviteCode}
                  </button>
                  <p className="text-xs text-text-secondary mt-2">
                    Click to copy
                  </p>
                </div>

                {/* Share Link */}
                <div>
                  <label className="block text-foreground text-sm font-medium mb-2">
                    Or share this link
                  </label>
                  <div className="flex gap-2">
                    <Input
                      type="text"
                      value={inviteLink}
                      readOnly
                      className="flex-1 text-sm"
                      onClick={(e) => e.currentTarget.select()}
                    />
                    <Button onClick={handleCopyLink} variant="secondary">
                      {copied ? "Copied!" : "Copy"}
                    </Button>
                  </div>
                </div>

                {/* Expiry info */}
                {expiresAt && (
                  <div className="flex items-center gap-2 text-xs text-text-secondary">
                    <Icon name="calendar" size={14} />
                    <span>Expires {formatExpiryDate(expiresAt)}</span>
                  </div>
                )}

                {/* Sharing tips */}
                <div className="bg-sand/50 rounded-xl p-3">
                  <p className="text-xs text-text-secondary flex items-start gap-2">
                    <Icon name="tip" size={14} className="mt-0.5 flex-shrink-0" />
                    <span>
                      Share via WhatsApp, iMessage, or any messaging app. Your
                      partner will need to sign up or log in to join.
                    </span>
                  </p>
                </div>

                {/* Generate new invite */}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={generateInvite}
                  className="w-full"
                >
                  Generate New Code
                </Button>
              </div>
            </>
          )}
        </ModalBody>
      </ModalContent>
    </Modal>
  );
}
