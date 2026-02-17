import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "You're invited! - Wallet Joy",
  description: "Join a household and manage finances together on Wallet Joy",
};

export default function JoinLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
