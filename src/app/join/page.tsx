"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { createClient } from "@/utils/supabase/client";
import { Button } from "@/components/ui/Button";
import { Card, CardContent } from "@/components/ui/Card";
import Icon from "@/components/icons/Icon";
import Image from "next/image";
import { motion } from "motion/react";

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
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-cream via-surface to-primary-pale p-4">
      {/* Background decoration */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <motion.div
          className="absolute top-20 left-10 text-6xl opacity-20"
          animate={{ y: [0, -10, 0], rotate: [0, 5, 0] }}
          transition={{ duration: 4, repeat: Infinity }}
        >
          🌱
        </motion.div>
        <motion.div
          className="absolute bottom-20 right-10 text-5xl opacity-20"
          animate={{ y: [0, 10, 0], rotate: [0, -5, 0] }}
          transition={{ duration: 5, repeat: Infinity }}
        >
          🌿
        </motion.div>
        <motion.div
          className="absolute top-1/3 right-1/4 text-4xl opacity-20"
          animate={{ scale: [1, 1.1, 1] }}
          transition={{ duration: 3, repeat: Infinity }}
        >
          💚
        </motion.div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.4 }}
      >
        <Card className="w-full max-w-md relative overflow-hidden">
          <CardContent className="p-8">
            {success ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-center"
              >
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", delay: 0.2 }}
                  className="w-20 h-20 bg-growth-pale rounded-full flex items-center justify-center mx-auto mb-6"
                >
                  <Icon name="check" size={40} className="text-growth" />
                </motion.div>
                <h2 className="text-2xl font-display font-bold text-foreground mb-2">
                  Welcome to the garden! 🌸
                </h2>
                <p className="text-text-secondary mb-6">
                  You're now part of the household. Redirecting to your
                  dashboard...
                </p>
                <motion.div
                  animate={{ scale: [1, 1.2, 1] }}
                  transition={{ duration: 1, repeat: Infinity }}
                  className="text-4xl"
                >
                  🎉
                </motion.div>
              </motion.div>
            ) : error ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center"
              >
                <div className="w-20 h-20 bg-expense/10 rounded-full flex items-center justify-center mx-auto mb-6">
                  <span className="text-4xl">🥀</span>
                </div>
                <h2 className="text-2xl font-display font-bold text-foreground mb-2">
                  Oops!
                </h2>
                <p className="text-text-secondary mb-6">{error}</p>
                <Button
                  onClick={() => router.push("/dashboard")}
                  variant="secondary"
                  className="w-full"
                >
                  Go to Dashboard
                </Button>
              </motion.div>
            ) : household ? (
              <div>
                <div className="text-center mb-8">
                  <motion.div
                    animate={{ y: [0, -5, 0] }}
                    transition={{ duration: 2, repeat: Infinity }}
                    className="w-20 h-20 bg-primary-pale rounded-full flex items-center justify-center mx-auto mb-4"
                  >
                    <span className="text-4xl">👨‍👩‍👧‍👦</span>
                  </motion.div>
                  <h2 className="text-2xl font-display font-bold text-foreground mb-2">
                    Join {household.name}
                  </h2>
                  <p className="text-text-secondary">
                    You've been invited to grow together 🌱
                  </p>
                </div>

                {household.household_members &&
                  household.household_members.length > 0 && (
                    <div className="bg-sand/30 rounded-2xl p-4 mb-6">
                      <p className="text-sm text-text-secondary mb-3 flex items-center gap-2">
                        <Icon name="user" size={16} />
                        Current garden partners:
                      </p>
                      <div className="space-y-2">
                        {household.household_members.map(
                          (member: any, index: number) => (
                            <motion.div
                              key={index}
                              initial={{ opacity: 0, x: -10 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: index * 0.1 }}
                              className="flex items-center gap-3 p-2 bg-surface rounded-xl"
                            >
                              <div className="w-8 h-8 rounded-full bg-primary-pale flex items-center justify-center">
                                <Icon
                                  name="user"
                                  size={16}
                                  className="text-primary"
                                />
                              </div>
                              <span className="text-sm text-foreground">
                                {member.profiles?.email || "Unknown"}
                              </span>
                            </motion.div>
                          ),
                        )}
                      </div>
                    </div>
                  )}

                <Button
                  onClick={handleJoin}
                  disabled={joining}
                  variant="bloom"
                  size="lg"
                  className="w-full"
                  pill
                >
                  {joining ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Joining...
                    </>
                  ) : (
                    <>
                      <Icon name="joint" size={20} />
                      Join Household
                    </>
                  )}
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
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}

export default function JoinPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-background">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
          >
            <Image src="/logo.png" alt="Loading" width={48} height={48} />
          </motion.div>
        </div>
      }
    >
      <JoinContent />
    </Suspense>
  );
}
