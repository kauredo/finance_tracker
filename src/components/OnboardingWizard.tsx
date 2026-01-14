"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import Icon from "@/components/icons/Icon";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/contexts/ToastContext";
import Image from "next/image";
import { motion, AnimatePresence } from "motion/react";

type Step = "welcome" | "currency" | "account" | "complete";

const currencies = [
  { code: "EUR", symbol: "€", name: "Euro" },
  { code: "USD", symbol: "$", name: "US Dollar" },
  { code: "GBP", symbol: "£", name: "British Pound" },
];

// Growth stages for visual feedback
const getGrowthStage = (step: Step) => {
  switch (step) {
    case "welcome":
      return { emoji: "🌰", label: "Planting the seed" };
    case "currency":
      return { emoji: "🌱", label: "Sprouting" };
    case "account":
      return { emoji: "🌿", label: "Growing" };
    case "complete":
      return { emoji: "🌸", label: "Blooming!" };
  }
};

export default function OnboardingWizard() {
  const router = useRouter();
  const { user } = useAuth();
  const { success: showSuccess, error: showError } = useToast();
  const [currentStep, setCurrentStep] = useState<Step>("welcome");
  const [loading, setLoading] = useState(false);

  // Form State
  const [currency, setCurrency] = useState("EUR");
  const [accountName, setAccountName] = useState("");
  const [accountBalance, setAccountBalance] = useState("");

  const handleCurrencySelect = (curr: string) => {
    setCurrency(curr);
    setCurrentStep("account");
  };

  const handleCreateAccount = async () => {
    if (!accountName || !accountBalance) {
      showError("Please fill in all fields");
      return;
    }

    setLoading(true);
    try {
      // Create Account
      const response = await fetch("/api/accounts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: accountName,
          type: "checking",
          balance: parseFloat(accountBalance),
          currency: currency,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to create account");
      }

      showSuccess("Your garden is ready! 🌱");
      setCurrentStep("complete");

      // Short delay before redirect
      setTimeout(() => {
        router.push("/dashboard");
      }, 2000);
    } catch (error) {
      console.error("Onboarding error:", error);
      showError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleSkip = () => {
    showSuccess("You can add an account later!");
    setCurrentStep("complete");
    setTimeout(() => {
      router.push("/dashboard");
    }, 1500);
  };

  const growth = getGrowthStage(currentStep);
  const progress =
    currentStep === "welcome"
      ? 0
      : currentStep === "currency"
        ? 33
        : currentStep === "account"
          ? 66
          : 100;

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-cream via-surface to-growth-pale p-4">
      {/* Floating decorations */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <motion.div
          className="absolute top-[15%] left-[10%] text-6xl opacity-20"
          animate={{ y: [0, -15, 0], rotate: [-5, 5, -5] }}
          transition={{ duration: 6, repeat: Infinity }}
        >
          🌱
        </motion.div>
        <motion.div
          className="absolute bottom-[20%] right-[15%] text-5xl opacity-20"
          animate={{ y: [0, 10, 0], scale: [1, 1.1, 1] }}
          transition={{ duration: 5, repeat: Infinity }}
        >
          🌿
        </motion.div>
        <motion.div
          className="absolute top-[40%] right-[10%] text-4xl opacity-15"
          animate={{ rotate: [0, 360] }}
          transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
        >
          🌸
        </motion.div>
        <motion.div
          className="absolute bottom-[30%] left-[20%] text-5xl opacity-15"
          animate={{ scale: [1, 1.2, 1] }}
          transition={{ duration: 4, repeat: Infinity }}
        >
          💚
        </motion.div>
      </div>

      <Card className="w-full max-w-xl relative overflow-hidden">
        {/* Progress Bar */}
        <div className="absolute top-0 left-0 w-full h-1.5 bg-sand">
          <motion.div
            className="h-full bg-gradient-to-r from-growth to-primary"
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.5 }}
          />
        </div>

        {/* Growth Stage Indicator */}
        {currentStep !== "complete" && (
          <div className="absolute top-4 right-4 flex items-center gap-2 bg-sand/50 px-3 py-1.5 rounded-full">
            <span className="text-lg">{growth.emoji}</span>
            <span className="text-xs text-text-secondary font-medium">
              {growth.label}
            </span>
          </div>
        )}

        <CardContent className="p-8 md:p-12">
          <AnimatePresence mode="wait">
            {/* Welcome Step */}
            {currentStep === "welcome" && (
              <motion.div
                key="welcome"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="text-center space-y-6"
              >
                <motion.div
                  animate={{ scale: [1, 1.05, 1], y: [0, -5, 0] }}
                  transition={{ duration: 3, repeat: Infinity }}
                >
                  <Image
                    src="/logo.png"
                    alt="Wallet Joy"
                    width={80}
                    height={80}
                    className="mx-auto"
                  />
                </motion.div>

                <div>
                  <h1 className="text-3xl font-display font-bold text-foreground mb-3">
                    Welcome to Wallet Joy!
                  </h1>
                  <p className="text-text-secondary text-lg max-w-md mx-auto">
                    Let's plant the seeds of your financial future. We'll have
                    you set up in less than a minute! 🌱
                  </p>
                </div>

                <Button
                  onClick={() => setCurrentStep("currency")}
                  variant="bloom"
                  size="lg"
                  className="w-full max-w-xs mx-auto"
                  pill
                >
                  Start Growing
                  <Icon name="chevron_down" size={20} className="-rotate-90" />
                </Button>
              </motion.div>
            )}

            {/* Currency Step */}
            {currentStep === "currency" && (
              <motion.div
                key="currency"
                initial={{ opacity: 0, x: 30 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -30 }}
                className="space-y-6"
              >
                <div className="text-center mb-8">
                  <span className="text-4xl mb-4 block">💰</span>
                  <h2 className="text-2xl font-display font-bold text-foreground mb-2">
                    Choose your soil
                  </h2>
                  <p className="text-text-secondary">
                    Pick your currency. You can change this later.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {currencies.map((curr, index) => (
                    <motion.button
                      key={curr.code}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.1 }}
                      onClick={() => handleCurrencySelect(curr.code)}
                      className={`p-6 rounded-2xl border-2 transition-all hover:scale-105 ${
                        currency === curr.code
                          ? "border-primary bg-primary-pale shadow-md"
                          : "border-border bg-surface hover:border-primary/30"
                      }`}
                    >
                      <div className="text-4xl font-bold text-foreground mb-2 font-mono">
                        {curr.symbol}
                      </div>
                      <div className="font-medium text-foreground">{curr.code}</div>
                      <div className="text-xs text-text-secondary mt-1">
                        {curr.name}
                      </div>
                    </motion.button>
                  ))}
                </div>

                <div className="flex justify-center mt-8">
                  <Button
                    onClick={() => setCurrentStep("welcome")}
                    variant="ghost"
                    size="sm"
                    className="text-text-secondary"
                  >
                    <Icon name="arrow_left" size={16} />
                    Back
                  </Button>
                </div>
              </motion.div>
            )}

            {/* Account Step */}
            {currentStep === "account" && (
              <motion.div
                key="account"
                initial={{ opacity: 0, x: 30 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -30 }}
                className="space-y-6"
              >
                <div className="text-center mb-8">
                  <span className="text-4xl mb-4 block">🏦</span>
                  <h2 className="text-2xl font-display font-bold text-foreground mb-2">
                    Plant your first pot
                  </h2>
                  <p className="text-text-secondary">
                    Add a bank account, cash wallet, or card to start tracking.
                  </p>
                </div>

                <div className="space-y-4 max-w-sm mx-auto">
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Account Name
                    </label>
                    <Input
                      type="text"
                      placeholder="e.g. Main Checking, Cash, Credit Card"
                      value={accountName}
                      onChange={(e) => setAccountName(e.target.value)}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Current Balance
                    </label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-text-secondary font-mono font-medium">
                        {currencies.find((c) => c.code === currency)?.symbol}
                      </span>
                      <Input
                        type="number"
                        placeholder="0.00"
                        value={accountBalance}
                        onChange={(e) => setAccountBalance(e.target.value)}
                        className="pl-10 font-mono"
                      />
                    </div>
                  </div>

                  <div className="flex gap-3 mt-8">
                    <Button
                      variant="ghost"
                      className="flex-1"
                      onClick={handleSkip}
                      disabled={loading}
                    >
                      Skip for now
                    </Button>
                    <Button
                      variant="bloom"
                      className="flex-[2]"
                      onClick={handleCreateAccount}
                      disabled={loading || !accountName || !accountBalance}
                      pill
                    >
                      {loading ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          Planting...
                        </>
                      ) : (
                        <>
                          <Icon name="check" size={18} />
                          Complete Setup
                        </>
                      )}
                    </Button>
                  </div>

                  <div className="text-center mt-4">
                    <Button
                      onClick={() => setCurrentStep("currency")}
                      variant="ghost"
                      size="sm"
                      disabled={loading}
                      className="text-text-secondary"
                    >
                      <Icon name="arrow_left" size={16} />
                      Back
                    </Button>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Complete Step */}
            {currentStep === "complete" && (
              <motion.div
                key="complete"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-center space-y-6"
              >
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", delay: 0.2 }}
                  className="w-24 h-24 bg-growth-pale rounded-full flex items-center justify-center mx-auto"
                >
                  <motion.span
                    className="text-5xl"
                    animate={{ scale: [1, 1.2, 1] }}
                    transition={{ duration: 1, repeat: Infinity }}
                  >
                    🌸
                  </motion.span>
                </motion.div>

                <div>
                  <h1 className="text-3xl font-display font-bold text-foreground mb-3">
                    Your garden is ready!
                  </h1>
                  <p className="text-text-secondary text-lg">
                    Taking you to your dashboard...
                  </p>
                </div>

                <motion.div
                  className="flex justify-center gap-2"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.5 }}
                >
                  {["🌱", "🌿", "🌸", "✨"].map((emoji, index) => (
                    <motion.span
                      key={index}
                      className="text-2xl"
                      initial={{ y: 20, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      transition={{ delay: 0.6 + index * 0.1 }}
                    >
                      {emoji}
                    </motion.span>
                  ))}
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </CardContent>
      </Card>
    </div>
  );
}
