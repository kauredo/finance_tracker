"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card, CardContent } from "@/components/ui/Card";
import Icon from "@/components/icons/Icon";
import Image from "next/image";
import { motion, AnimatePresence } from "motion/react";

export default function AuthPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [signupSuccess, setSignupSuccess] = useState(false);

  const { signIn, signUp, user, loading: authLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!authLoading && user) {
      router.push("/dashboard");
    }
  }, [user, authLoading, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    setSignupSuccess(false);

    try {
      if (isLogin) {
        await signIn(email, password);
        router.push("/dashboard");
      } else {
        await signUp(email, password, fullName);
        setSignupSuccess(true);
        setEmail("");
        setPassword("");
        setFullName("");
      }
    } catch (err: any) {
      setError(err.message || "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  if (authLoading) {
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

  if (user) {
    return null;
  }

  return (
    <div className="min-h-screen flex bg-background">
      {/* Left side - Decorative */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-primary-pale via-cream to-growth-pale relative overflow-hidden">
        {/* Background pattern */}
        <div className="absolute inset-0 opacity-30">
          <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
            <pattern
              id="pattern"
              x="0"
              y="0"
              width="40"
              height="40"
              patternUnits="userSpaceOnUse"
            >
              <circle
                cx="20"
                cy="20"
                r="2"
                fill="currentColor"
                className="text-primary/20"
              />
            </pattern>
            <rect width="100%" height="100%" fill="url(#pattern)" />
          </svg>
        </div>

        {/* Content */}
        <div className="relative z-10 flex flex-col items-center justify-center w-full p-12">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.6, ease: [0.34, 1.56, 0.64, 1] }}
            className="mb-8"
          >
            <Image
              src="/logo.png"
              alt="Wallet Joy"
              width={180}
              height={180}
              className="drop-shadow-lg"
            />
          </motion.div>

          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.5 }}
            className="text-center max-w-md"
          >
            <h1 className="text-4xl font-display font-bold text-foreground mb-4">
              Grow Your Savings
            </h1>
            <p className="text-lg text-text-secondary">
              Plant the seeds of financial wellness. Track expenses, set goals,
              and watch your wealth bloom.
            </p>
          </motion.div>

          {/* Floating elements */}
          <motion.div
            className="absolute top-20 left-20 text-4xl"
            animate={{ y: [0, -10, 0] }}
            transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
          >
            🌱
          </motion.div>
          <motion.div
            className="absolute bottom-32 right-24 text-4xl"
            animate={{ y: [0, -15, 0] }}
            transition={{
              duration: 4,
              repeat: Infinity,
              ease: "easeInOut",
              delay: 1,
            }}
          >
            🌸
          </motion.div>
          <motion.div
            className="absolute top-1/3 right-16 text-3xl"
            animate={{ y: [0, -8, 0] }}
            transition={{
              duration: 3.5,
              repeat: Infinity,
              ease: "easeInOut",
              delay: 0.5,
            }}
          >
            💰
          </motion.div>
        </div>
      </div>

      {/* Right side - Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 sm:p-12">
        <div className="w-full max-w-md">
          {/* Mobile Logo */}
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="text-center mb-8 lg:hidden"
          >
            <Image
              src="/logo.png"
              alt="Wallet Joy"
              width={100}
              height={100}
              className="mx-auto mb-4"
            />
            <h1 className="text-2xl font-display font-bold text-foreground">
              Wallet Joy
            </h1>
          </motion.div>

          {/* Desktop heading */}
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="hidden lg:block mb-8"
          >
            <h2 className="text-3xl font-display font-bold text-foreground mb-2">
              {isLogin ? "Welcome back!" : "Start your journey"}
            </h2>
            <p className="text-text-secondary">
              {isLogin
                ? "Sign in to continue nurturing your finances"
                : "Create an account and plant the seeds of your financial future"}
            </p>
          </motion.div>

          <Card className="border-0 shadow-xl">
            <CardContent className="p-8">
              <AnimatePresence mode="wait">
                {signupSuccess ? (
                  <motion.div
                    key="success"
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="text-center space-y-4"
                  >
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{
                        delay: 0.2,
                        type: "spring",
                        stiffness: 200,
                      }}
                      className="w-20 h-20 mx-auto bg-growth-pale rounded-full flex items-center justify-center mb-4"
                    >
                      <span className="text-4xl">🌱</span>
                    </motion.div>
                    <h3 className="text-xl font-display font-bold text-foreground">
                      Seed planted!
                    </h3>
                    <p className="text-text-secondary">
                      Check your email to confirm your account and start growing
                      your financial garden.
                    </p>
                    <Button
                      variant="ghost"
                      onClick={() => {
                        setSignupSuccess(false);
                        setIsLogin(true);
                      }}
                      className="mt-4"
                    >
                      Back to login
                    </Button>
                  </motion.div>
                ) : (
                  <motion.div
                    key="form"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                  >
                    {/* Tab Switcher */}
                    <div className="flex bg-sand rounded-2xl p-1 mb-8">
                      <button
                        onClick={() => {
                          setIsLogin(true);
                          setError("");
                        }}
                        className={`flex-1 py-2.5 px-4 rounded-xl text-sm font-medium transition-all ${
                          isLogin
                            ? "bg-surface text-foreground shadow-sm"
                            : "text-text-secondary hover:text-foreground"
                        }`}
                      >
                        Sign In
                      </button>
                      <button
                        onClick={() => {
                          setIsLogin(false);
                          setError("");
                        }}
                        className={`flex-1 py-2.5 px-4 rounded-xl text-sm font-medium transition-all ${
                          !isLogin
                            ? "bg-surface text-foreground shadow-sm"
                            : "text-text-secondary hover:text-foreground"
                        }`}
                      >
                        Sign Up
                      </button>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-5">
                      <AnimatePresence mode="wait">
                        {!isLogin && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.2 }}
                          >
                            <Input
                              label="Full Name"
                              type="text"
                              value={fullName}
                              onChange={(e) => setFullName(e.target.value)}
                              placeholder="Your name"
                              required={!isLogin}
                              icon={<Icon name="user" size={20} />}
                            />
                          </motion.div>
                        )}
                      </AnimatePresence>

                      <Input
                        label="Email"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="you@example.com"
                        required
                        error={!!error}
                      />

                      <Input
                        label="Password"
                        type={showPassword ? "text" : "password"}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Enter your password"
                        required
                        error={!!error}
                        helperText={error}
                        icon={<Icon name="lock" size={20} />}
                        endIcon={
                          <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="focus:outline-none hover:text-foreground transition-colors"
                          >
                            <Icon
                              name={showPassword ? "eye_off" : "eye"}
                              size={20}
                            />
                          </button>
                        }
                      />

                      <Button
                        type="submit"
                        isLoading={loading}
                        className="w-full mt-2"
                        size="lg"
                        pill
                      >
                        {isLogin ? "Sign In" : "Create Account"}
                      </Button>
                    </form>

                    {/* Footer text */}
                    <p className="text-center text-sm text-text-secondary mt-6">
                      {isLogin ? (
                        <>
                          New to Wallet Joy?{" "}
                          <button
                            onClick={() => setIsLogin(false)}
                            className="text-primary font-medium hover:underline"
                          >
                            Create an account
                          </button>
                        </>
                      ) : (
                        <>
                          Already have an account?{" "}
                          <button
                            onClick={() => setIsLogin(true)}
                            className="text-primary font-medium hover:underline"
                          >
                            Sign in
                          </button>
                        </>
                      )}
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
