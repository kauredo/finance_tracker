"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { createClient } from "@/utils/supabase/client";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import Icon from "@/components/icons/Icon";

function JoinContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, loading: authLoading } = useAuth();
  const [household, setHousehold] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const householdId = searchParams?.get("household");

  useEffect(() => {
    if (!authLoading && !user) {
      // Redirect to auth with return URL
      router.push(`/auth?redirect=/join?household=${householdId}`);
    } else if (user && householdId) {
      fetchHousehold();
    }
  }, [user, authLoading, householdId]);

  const fetchHousehold = async () => {
    if (!householdId) return;

    try {
      const response = await fetch("/api/get-household-info", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ householdId }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to fetch household info");
      }

      // Check if user is already a member (we can't check this easily without auth,
      // but the accept-invite endpoint will handle it.
      // For now, we just show the join UI. If they are already a member,
      // the accept-invite call will return a specific error or we can redirect them.)

      // Ideally we should check if they are already a member if they are logged in.
      // But since we are using the admin API to get info, we don't get the member list relative to the user easily without more logic.
      // Let's rely on the accept-invite check or a separate check if needed.
      // Actually, if we are logged in, we can still check membership via RLS if we wanted,
      // but the whole point was RLS was blocking.

      // Let's just set the household data for display.
      setHousehold(data);
    } catch (err: any) {
      console.error("Error fetching household:", err);
      setError("Invalid invitation link or household not found.");
    } finally {
      setLoading(false);
    }
  };

  const handleJoin = async () => {
    if (!user || !householdId) return;

    setJoining(true);
    setError(null);

    try {
      const supabase = createClient();
      const response = await fetch("/api/accept-invite", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
        },
        body: JSON.stringify({ householdId }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to join household");
      }

      setSuccess(true);
      setTimeout(() => router.push("/dashboard"), 2000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setJoining(false);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-muted">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md bg-surface border-border">
        <div className="p-8">
          {success ? (
            <div className="text-center">
              <Icon
                name="check"
                size={64}
                className="mb-4 mx-auto text-success"
              />
              <h2 className="text-2xl font-semibold text-foreground mb-2">
                Welcome to the household!
              </h2>
              <p className="text-muted mb-6">
                You now have access to joint accounts. Redirecting to
                dashboard...
              </p>
            </div>
          ) : error ? (
            <div className="text-center">
              <Icon
                name="cross"
                size={64}
                className="mb-4 mx-auto text-danger"
              />
              <h2 className="text-2xl font-semibold text-foreground mb-2">
                Invitation Error
              </h2>
              <p className="text-muted mb-6">{error}</p>
              <Button onClick={() => router.push("/dashboard")}>
                Go to Dashboard
              </Button>
            </div>
          ) : household ? (
            <div>
              <div className="text-center mb-6">
                <Icon
                  name="joint"
                  size={64}
                  className="mb-4 mx-auto text-primary"
                />
                <h2 className="text-2xl font-semibold text-foreground mb-2">
                  Join {household.name}
                </h2>
                <p className="text-muted">
                  You've been invited to join this household
                </p>
              </div>

              {household.household_members &&
                household.household_members.length > 0 && (
                  <div className="bg-background rounded-lg p-4 mb-6">
                    <p className="text-sm text-muted mb-2">Current members:</p>
                    <div className="space-y-2">
                      {household.household_members.map(
                        (member: any, index: number) => (
                          <div key={index} className="text-sm text-foreground">
                            • {member.profiles?.email || "Unknown"}
                          </div>
                        ),
                      )}
                    </div>
                  </div>
                )}

              <Button
                onClick={handleJoin}
                isLoading={joining}
                className="w-full"
              >
                {joining ? "Joining..." : "Join Household"}
              </Button>

              <Button
                variant="ghost"
                onClick={() => router.push("/dashboard")}
                className="w-full mt-3"
              >
                Cancel
              </Button>
            </div>
          ) : null}
        </div>
      </Card>
    </div>
  );
}

export default function JoinPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-background">
          <div className="text-muted">Loading...</div>
        </div>
      }
    >
      <JoinContent />
    </Suspense>
  );
}
