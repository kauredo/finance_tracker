"use client";

import { useState, useRef, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import Icon from "@/components/icons/Icon";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Avatar } from "@/components/ui/Avatar";

export default function UserMenu() {
  const { user, signOut } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  // Close menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSignOut = async () => {
    try {
      await signOut();
      router.push("/auth");
    } catch (error) {
      console.error("Sign out error:", error);
    }
  };

  if (!user) return null;

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 rounded-full transition-transform hover:scale-105"
        aria-label="User menu"
      >
        <Avatar name={user.fullName || user.email || "User"} size="sm" />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-64 bg-surface border border-border rounded-xl shadow-xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-100">
          {/* User Info Header */}
          <div className="px-4 py-3 border-b border-border bg-surface-alt/50">
            <p className="text-sm font-medium text-foreground truncate">
              {user.email}
            </p>
            <p className="text-xs text-muted mt-0.5">Free Plan</p>
          </div>

          {/* Menu Items */}
          <div className="p-2 space-y-1">
            {/* Theme Toggle */}
            <Button
              onClick={toggleTheme}
              variant="ghost"
              className="w-full flex items-center justify-between px-3 py-2 text-sm text-foreground rounded-lg hover:bg-surface-alt h-auto font-normal"
            >
              <div className="flex items-center gap-3">
                <Icon
                  name={theme === "light" ? "sun" : "moon"}
                  size={18}
                  className="text-muted"
                />
                <span>{theme === "light" ? "Light Mode" : "Dark Mode"}</span>
              </div>
              {/* Switch-like visual */}
              <div
                className={`w-8 h-4 rounded-full relative transition-colors ${theme === "dark" ? "bg-primary" : "bg-gray-300"}`}
              >
                <div
                  className={`absolute top-0.5 w-3 h-3 rounded-full bg-white shadow-sm transition-all ${theme === "dark" ? "left-4.5" : "left-0.5"}`}
                  style={{ left: theme === "dark" ? "18px" : "2px" }}
                />
              </div>
            </Button>

            {/* Settings Link */}
            <Link
              href="/settings"
              onClick={() => setIsOpen(false)}
              className="w-full flex items-center gap-3 px-3 py-2 text-sm text-foreground rounded-lg hover:bg-surface-alt transition-colors"
            >
              <Icon name="settings" size={18} className="text-muted" />
              <span>Settings</span>
            </Link>

            {/* Admin Link - only for admins */}
            {user.isAdmin && (
              <Link
                href="/admin"
                onClick={() => setIsOpen(false)}
                className="w-full flex items-center gap-3 px-3 py-2 text-sm text-foreground rounded-lg hover:bg-surface-alt transition-colors"
              >
                <Icon name="shield" size={18} className="text-muted" />
                <span>Admin Panel</span>
              </Link>
            )}

            <div className="h-px bg-border my-1" />

            {/* Sign Out */}
            <Button
              onClick={handleSignOut}
              variant="ghost"
              className="w-full justify-start px-3 py-2 text-sm text-red-500 hover:bg-red-500/10 h-auto font-normal"
            >
              <Icon name="logout" size={18} className="mr-3" />
              <span>Sign Out</span>
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
