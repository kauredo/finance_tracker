"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import Image from "next/image";
import { motion } from "motion/react";

interface RequireConfirmedProps {
  children: React.ReactNode;
}

/**
 * Wrapper component that ensures the user is authenticated and confirmed.
 * Redirects to /auth if not authenticated.
 * Redirects to /pending if authenticated but not confirmed.
 */
export default function RequireConfirmed({ children }: RequireConfirmedProps) {
  const { user, loading, isAuthenticated } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading) {
      if (!isAuthenticated) {
        router.push("/auth");
      } else if (user && !user.isConfirmed) {
        router.push("/pending");
      }
    }
  }, [loading, isAuthenticated, user, router]);

  // Show loading while checking auth
  if (loading) {
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

  // Still loading user profile
  if (isAuthenticated && !user) {
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

  // Not authenticated - will redirect
  if (!isAuthenticated) {
    return null;
  }

  // Not confirmed - will redirect
  if (user && !user.isConfirmed) {
    return null;
  }

  // User is authenticated and confirmed
  return <>{children}</>;
}
