"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import Image from "next/image";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import { useState } from "react";
import Icon, { IconName } from "@/components/icons/Icon";
import { motion, AnimatePresence } from "motion/react";

import UserMenu from "@/components/UserMenu";
import GlobalSearch from "@/components/GlobalSearch";

export default function NavBar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, signOut } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [isLogoHovered, setIsLogoHovered] = useState(false);

  const navigation: { name: string; href: string; icon: IconName }[] = [
    { name: "Transactions", href: "/transactions", icon: "transactions" },
    { name: "Categories", href: "/categories", icon: "tag" },
    { name: "Budgets", href: "/budgets", icon: "chart" },
    { name: "Goals", href: "/goals", icon: "savings" },
    { name: "Recurring", href: "/recurring", icon: "calendar" },
    { name: "Reports", href: "/reports", icon: "reports" },
  ];

  const mobileNavigation = [
    { name: "Dashboard", href: "/dashboard", icon: "dashboard" as IconName },
    ...navigation,
    { name: "Settings", href: "/settings", icon: "settings" as IconName },
  ];

  const handleSignOut = async () => {
    setIsSigningOut(true);
    try {
      await signOut();
      router.push("/auth");
    } catch (error) {
      console.error("Sign out error:", error);
      setIsSigningOut(false);
    }
  };

  if (!user) return null;

  return (
    <nav className="sticky top-0 z-40 bg-surface/80 backdrop-blur-xl border-b border-border/50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link
            href="/dashboard"
            className="flex items-center gap-3 group"
            onMouseEnter={() => setIsLogoHovered(true)}
            onMouseLeave={() => setIsLogoHovered(false)}
          >
            <motion.div
              animate={isLogoHovered ? { rotate: [0, -5, 5, -5, 0] } : {}}
              transition={{ duration: 0.4 }}
            >
              <Image
                src="/logo.png"
                alt="Wallet Joy"
                width={36}
                height={36}
                className="drop-shadow-sm"
              />
            </motion.div>
            <span className="text-lg font-display font-bold text-foreground hidden sm:block group-hover:text-primary transition-colors">
              Wallet Joy
            </span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-1 bg-sand/50 rounded-full p-1">
            {navigation.map((item) => {
              const isActive =
                pathname === item.href || pathname?.startsWith(item.href + "/");
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className="relative px-4 py-2 text-sm font-medium transition-all flex items-center rounded-full"
                >
                  {isActive && (
                    <motion.div
                      layoutId="nav-pill"
                      className="absolute inset-0 bg-surface shadow-sm rounded-full border border-border/50"
                      transition={{
                        type: "spring",
                        stiffness: 400,
                        damping: 30,
                      }}
                    />
                  )}
                  <span
                    className={`relative z-10 flex items-center transition-colors ${
                      isActive
                        ? "text-primary"
                        : "text-muted hover:text-foreground"
                    }`}
                  >
                    <Icon name={item.icon} size={16} className="mr-1.5" />
                    {item.name}
                  </span>
                </Link>
              );
            })}
          </div>

          {/* Right side actions */}
          <div className="flex items-center gap-3">
            {/* Global Search - Desktop only */}
            <div className="hidden md:block">
              <GlobalSearch />
            </div>

            {/* Theme Toggle - Desktop */}
            <motion.button
              onClick={toggleTheme}
              className="hidden md:flex items-center justify-center w-10 h-10 rounded-full bg-sand hover:bg-clay transition-colors"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              aria-label="Toggle theme"
            >
              <AnimatePresence mode="wait">
                <motion.div
                  key={theme}
                  initial={{ rotate: -90, opacity: 0 }}
                  animate={{ rotate: 0, opacity: 1 }}
                  exit={{ rotate: 90, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <Icon
                    name={theme === "light" ? "sun" : "moon"}
                    size={20}
                    className="text-foreground"
                  />
                </motion.div>
              </AnimatePresence>
            </motion.button>

            {/* Desktop User Menu */}
            <div className="hidden md:block">
              <UserMenu />
            </div>

            {/* Mobile menu button */}
            <motion.button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="md:hidden flex items-center justify-center w-10 h-10 rounded-full bg-sand hover:bg-clay transition-colors"
              whileTap={{ scale: 0.95 }}
              aria-label="Toggle menu"
            >
              <AnimatePresence mode="wait">
                <motion.svg
                  key={isMobileMenuOpen ? "close" : "menu"}
                  initial={{ rotate: -90, opacity: 0 }}
                  animate={{ rotate: 0, opacity: 1 }}
                  exit={{ rotate: 90, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="w-5 h-5 text-foreground"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  {isMobileMenuOpen ? (
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  ) : (
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 6h16M4 12h16M4 18h16"
                    />
                  )}
                </motion.svg>
              </AnimatePresence>
            </motion.button>
          </div>
        </div>

        {/* Mobile menu */}
        <AnimatePresence>
          {isMobileMenuOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
              className="md:hidden overflow-hidden"
            >
              <div className="py-4 space-y-1 border-t border-border/50">
                {mobileNavigation.map((item, index) => {
                  const isActive =
                    pathname === item.href ||
                    pathname?.startsWith(item.href + "/");
                  return (
                    <motion.div
                      key={item.name}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05 }}
                    >
                      <Link
                        href={item.href}
                        onClick={() => setIsMobileMenuOpen(false)}
                        className={`flex items-center w-full px-4 py-3 rounded-2xl text-base font-medium transition-all ${
                          isActive
                            ? "bg-primary-pale text-primary"
                            : "text-foreground hover:bg-sand"
                        }`}
                      >
                        <div
                          className={`p-2 rounded-xl mr-3 ${
                            isActive ? "bg-primary/10" : "bg-sand"
                          }`}
                        >
                          <Icon
                            name={item.icon}
                            size={20}
                            className={isActive ? "text-primary" : "text-muted"}
                          />
                        </div>
                        {item.name}
                        {isActive && (
                          <div className="ml-auto w-2 h-2 rounded-full bg-primary" />
                        )}
                      </Link>
                    </motion.div>
                  );
                })}

                {/* Divider */}
                <div className="my-4 border-t border-border/50" />

                {/* Mobile Theme Toggle */}
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: mobileNavigation.length * 0.05 }}
                >
                  <button
                    onClick={toggleTheme}
                    className="flex items-center w-full px-4 py-3 rounded-2xl text-base font-medium text-foreground hover:bg-sand transition-all"
                  >
                    <div className="p-2 rounded-xl mr-3 bg-sand">
                      <Icon
                        name={theme === "light" ? "sun" : "moon"}
                        size={20}
                        className="text-muted"
                      />
                    </div>
                    {theme === "light" ? "Dark Mode" : "Light Mode"}
                  </button>
                </motion.div>

                {/* Mobile Sign Out */}
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: (mobileNavigation.length + 1) * 0.05 }}
                >
                  <button
                    onClick={handleSignOut}
                    disabled={isSigningOut}
                    className="flex items-center w-full px-4 py-3 rounded-2xl text-base font-medium text-expense hover:bg-expense-light transition-all disabled:opacity-50"
                  >
                    <div className="p-2 rounded-xl mr-3 bg-expense-light">
                      <Icon name="logout" size={20} className="text-expense" />
                    </div>
                    {isSigningOut ? "Signing out..." : "Sign Out"}
                  </button>
                </motion.div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </nav>
  );
}
