"use client";

import { useEffect } from "react";
import { useQuery } from "convex/react";
import { useRouter } from "next/navigation";
import { api } from "../../../convex/_generated/api";
import { useAuthActions } from "@convex-dev/auth/react";
import { Button } from "@/components/ui/Button";
import { Card, CardContent } from "@/components/ui/Card";
import Image from "next/image";
import { motion } from "motion/react";

export default function PendingPage() {
  const router = useRouter();
  const { signOut } = useAuthActions();
  const userStatus = useQuery(api.admin.getCurrentUserStatus);

  // If user is confirmed, redirect to dashboard
  useEffect(() => {
    if (userStatus?.isConfirmed) {
      router.push("/dashboard");
    }
  }, [userStatus, router]);

  // If not logged in, redirect to auth
  useEffect(() => {
    if (userStatus === null) {
      router.push("/auth");
    }
  }, [userStatus, router]);

  const handleSignOut = async () => {
    await signOut();
    router.push("/");
  };

  const handleRefresh = () => {
    window.location.reload();
  };

  if (userStatus === undefined) {
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
          animate={{ y: [0, -10, 0] }}
          transition={{ duration: 4, repeat: Infinity }}
        >
          🌱
        </motion.div>
        <motion.div
          className="absolute bottom-20 right-10 text-5xl opacity-20"
          animate={{ y: [0, 10, 0] }}
          transition={{ duration: 5, repeat: Infinity }}
        >
          ⏳
        </motion.div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.4 }}
      >
        <Card className="w-full max-w-md">
          <CardContent className="p-8 text-center">
            <motion.div
              animate={{ scale: [1, 1.05, 1] }}
              transition={{ duration: 3, repeat: Infinity }}
              className="w-24 h-24 bg-warning/10 rounded-full flex items-center justify-center mx-auto mb-6"
            >
              <span className="text-5xl" aria-hidden="true">⏳</span>
            </motion.div>

            <h2 className="text-2xl font-display font-bold text-foreground mb-3">
              Account Pending
            </h2>

            <p className="text-text-secondary mb-6">
              Your account is waiting for confirmation. An administrator will
              review and approve your access soon.
            </p>

            <div className="bg-sand/50 rounded-xl p-4 mb-6">
              <p className="text-sm text-text-secondary">
                Signed in as{" "}
                <span className="font-medium text-foreground">
                  {userStatus?.email}
                </span>
              </p>
            </div>

            <div className="space-y-3">
              <Button
                variant="secondary"
                onClick={handleRefresh}
                className="w-full"
              >
                Check Status
              </Button>

              <Button
                variant="ghost"
                onClick={handleSignOut}
                className="w-full"
              >
                Sign Out
              </Button>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
