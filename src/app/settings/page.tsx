"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import NavBar from "@/components/NavBar";
import { createClient } from "@/utils/supabase/client";
import { useToast } from "@/contexts/ToastContext";
import Link from "next/link";
import Image from "next/image";
import Icon from "@/components/icons/Icon";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input, Select } from "@/components/ui/Input";
import { motion } from "motion/react";

interface Profile {
  id: string;
  email: string;
  full_name: string;
  currency: string;
  date_format: string;
}

const navigationItems = [
  {
    href: "/accounts",
    icon: "accounts" as const,
    iconColor: "#7cb482",
    bgColor: "bg-growth-pale",
    title: "Money Pots",
    description: "Manage your bank accounts and balances",
  },
  {
    href: "/categories",
    icon: "tag" as const,
    iconColor: "#ff8fab",
    bgColor: "bg-primary-pale",
    title: "Categories",
    description: "Customize how you organize spending",
  },
  {
    href: "/household",
    icon: "user" as const,
    iconColor: "#ffb74d",
    bgColor: "bg-warning/10",
    title: "Garden Partners",
    description: "Manage household members",
  },
  {
    href: "/export",
    icon: "download" as const,
    iconColor: "#64b5f6",
    bgColor: "bg-info/10",
    title: "Export Data",
    description: "Download your financial history",
  },
];

export default function SettingsPage() {
  const router = useRouter();
  const { success: showSuccess, error: showError } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState<Profile | null>(null);

  // Form states
  const [fullName, setFullName] = useState("");
  const [currency, setCurrency] = useState("EUR");
  const [dateFormat, setDateFormat] = useState("DD/MM/YYYY");

  // Password states
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordLoading, setPasswordLoading] = useState(false);

  const supabase = createClient();

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        router.push("/auth");
        return;
      }

      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      if (error) throw error;

      if (data) {
        setProfile(data);
        setFullName(data.full_name || "");
        setCurrency(data.currency || "EUR");
        setDateFormat(data.date_format || "DD/MM/YYYY");
      }
    } catch (error) {
      console.error("Error fetching profile:", error);
      showError("Failed to load profile");
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const response = await fetch("/api/settings/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          full_name: fullName,
          currency,
          date_format: dateFormat,
        }),
      });

      if (!response.ok) throw new Error("Failed to update profile");

      showSuccess("Your garden settings have been updated!");
      fetchProfile();
    } catch (error) {
      console.error("Error updating profile:", error);
      showError("Failed to update profile");
    } finally {
      setSaving(false);
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (newPassword !== confirmPassword) {
      showError("Passwords do not match");
      return;
    }

    if (newPassword.length < 6) {
      showError("Password must be at least 6 characters");
      return;
    }

    setPasswordLoading(true);

    try {
      const response = await fetch("/api/settings/password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: newPassword }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to update password");
      }

      showSuccess("Password updated successfully");
      setNewPassword("");
      setConfirmPassword("");
    } catch (error: any) {
      console.error("Error updating password:", error);
      showError(error.message);
    } finally {
      setPasswordLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <NavBar />
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="animate-pulse space-y-6">
            <div className="h-32 bg-sand rounded-3xl"></div>
            <div className="grid grid-cols-2 gap-4">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-24 bg-sand rounded-2xl"></div>
              ))}
            </div>
            <div className="h-64 bg-sand rounded-3xl"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <NavBar />

      {/* Hero Header */}
      <div className="bg-gradient-to-br from-sand via-cream to-primary-pale">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-4"
          >
            <div className="p-4 bg-surface rounded-2xl shadow-sm">
              <motion.div
                animate={{ rotate: [0, 10, -10, 0] }}
                transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
              >
                <span className="text-4xl">⚙️</span>
              </motion.div>
            </div>
            <div>
              <h1 className="text-3xl font-display font-bold text-foreground">
                Garden Settings
              </h1>
              <p className="text-text-secondary">
                Customize how your financial garden grows
              </p>
            </div>
          </motion.div>
        </div>
      </div>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 -mt-6">
        <div className="space-y-6">
          {/* Quick Navigation */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {navigationItems.map((item, index) => (
                <motion.div
                  key={item.href}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 + index * 0.05 }}
                >
                  <Link href={item.href}>
                    <Card className="group hover:shadow-lg hover:border-primary/30 transition-all cursor-pointer">
                      <div className="flex items-center gap-4 p-4">
                        <div
                          className={`w-12 h-12 rounded-xl ${item.bgColor} flex items-center justify-center transition-transform group-hover:scale-110`}
                          style={{ color: item.iconColor }}
                        >
                          <Icon
                            name={item.icon}
                            size={24}
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-display font-bold text-foreground group-hover:text-primary transition-colors">
                            {item.title}
                          </h3>
                          <p className="text-sm text-text-secondary truncate">
                            {item.description}
                          </p>
                        </div>
                        <Icon
                          name="chevron_down"
                          size={20}
                          className="text-text-secondary -rotate-90 group-hover:translate-x-1 transition-transform"
                        />
                      </div>
                    </Card>
                  </Link>
                </motion.div>
              ))}
            </div>
          </motion.div>

          {/* Profile & Preferences */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <Card>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-primary-pale rounded-xl">
                    <Icon name="user" size={20} className="text-primary" />
                  </div>
                  <CardTitle>Profile & Preferences</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleUpdateProfile} className="space-y-6">
                  <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                    {/* Email */}
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">
                        Email Address
                      </label>
                      <Input
                        type="email"
                        disabled
                        value={profile?.email || ""}
                        className="bg-sand/50 text-text-secondary cursor-not-allowed"
                      />
                      <p className="mt-1.5 text-xs text-text-secondary">
                        Email cannot be changed
                      </p>
                    </div>

                    {/* Full Name */}
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">
                        Full Name
                      </label>
                      <Input
                        type="text"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        placeholder="Your name"
                      />
                    </div>

                    {/* Currency */}
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">
                        Currency
                      </label>
                      <Select
                        value={currency}
                        onChange={(e) => setCurrency(e.target.value)}
                      >
                        <option value="EUR">EUR (€) - Euro</option>
                        <option value="USD">USD ($) - US Dollar</option>
                        <option value="GBP">GBP (£) - British Pound</option>
                        <option value="JPY">JPY (¥) - Japanese Yen</option>
                      </Select>
                    </div>

                    {/* Date Format */}
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">
                        Date Format
                      </label>
                      <Select
                        value={dateFormat}
                        onChange={(e) => setDateFormat(e.target.value)}
                      >
                        <option value="DD/MM/YYYY">DD/MM/YYYY (31/12/2024)</option>
                        <option value="MM/DD/YYYY">MM/DD/YYYY (12/31/2024)</option>
                        <option value="YYYY-MM-DD">YYYY-MM-DD (2024-12-31)</option>
                      </Select>
                    </div>
                  </div>

                  <div className="flex justify-end pt-4 border-t border-border">
                    <Button
                      type="submit"
                      disabled={saving}
                      variant="bloom"
                      pill
                    >
                      {saving ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          Saving...
                        </>
                      ) : (
                        <>
                          <Icon name="check" size={18} />
                          Save Changes
                        </>
                      )}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </motion.div>

          {/* Security Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <Card>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-warning/10 rounded-xl">
                    <Icon name="lock" size={20} className="text-warning" />
                  </div>
                  <CardTitle>Security</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleUpdatePassword} className="space-y-6">
                  <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">
                        New Password
                      </label>
                      <Input
                        type="password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="••••••••"
                        minLength={6}
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">
                        Confirm New Password
                      </label>
                      <Input
                        type="password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="••••••••"
                        minLength={6}
                      />
                    </div>
                  </div>

                  <div className="flex justify-end pt-4 border-t border-border">
                    <Button
                      type="submit"
                      variant="secondary"
                      disabled={passwordLoading || !newPassword}
                    >
                      {passwordLoading ? (
                        <>
                          <div className="w-4 h-4 border-2 border-foreground border-t-transparent rounded-full animate-spin" />
                          Updating...
                        </>
                      ) : (
                        <>
                          <Icon name="lock" size={18} />
                          Update Password
                        </>
                      )}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </motion.div>

          {/* App Info */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
          >
            <Card className="bg-sand/30">
              <CardContent className="py-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <Image
                      src="/logo.png"
                      alt="Wallet Joy"
                      width={48}
                      height={48}
                      className="rounded-xl"
                    />
                    <div>
                      <h3 className="font-display font-bold text-foreground">
                        Wallet Joy
                      </h3>
                      <p className="text-sm text-text-secondary">
                        Grow your financial garden 🌱
                      </p>
                    </div>
                  </div>
                  <span className="text-xs text-text-secondary bg-surface px-3 py-1 rounded-full">
                    v1.0.0
                  </span>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </main>
    </div>
  );
}
