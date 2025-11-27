"use client";

import { useState, useRef, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import Icon from "@/components/icons/Icon";
import Link from "next/link";
import { useRouter } from "next/navigation";

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

  // Get initials from email
  const initials = user.email?.substring(0, 2).toUpperCase() || "U";

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-center w-10 h-10 rounded-full bg-primary/10 text-primary hover:bg-primary/20 transition-colors border border-primary/20 cursor-pointer"
        aria-label="User menu"
      >
        <span className="font-semibold text-sm">{initials}</span>
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
            <button
              onClick={toggleTheme}
              className="w-full flex items-center justify-between px-3 py-2 text-sm text-foreground rounded-lg hover:bg-surface-alt transition-colors"
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
            </button>

            {/* Settings Link */}
            <Link
              href="/settings"
              onClick={() => setIsOpen(false)}
              className="w-full flex items-center gap-3 px-3 py-2 text-sm text-foreground rounded-lg hover:bg-surface-alt transition-colors"
            >
              <Icon name="settings" size={18} className="text-muted" />
              <span>Settings</span>
            </Link>

            <div className="h-px bg-border my-1" />

            {/* Sign Out */}
            <button
              onClick={handleSignOut}
              className="w-full flex items-center gap-3 px-3 py-2 text-sm text-red-500 rounded-lg hover:bg-red-500/10 transition-colors"
            >
              <Icon name="logout" size={18} />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
