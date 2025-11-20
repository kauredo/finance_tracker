'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Card, CardContent } from '@/components/ui/Card'
import Image from 'next/image'

export default function AuthPage() {
  const [isLogin, setIsLogin] = useState(true)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [signupSuccess, setSignupSuccess] = useState(false)

  const { signIn, signUp, user, loading: authLoading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!authLoading && user) {
      router.push('/dashboard')
    }
  }, [user, authLoading, router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    setSignupSuccess(false)

    try {
      if (isLogin) {
        await signIn(email, password)
        router.push('/dashboard')
      } else {
        await signUp(email, password, fullName)
        setSignupSuccess(true)
        setEmail('')
        setPassword('')
        setFullName('')
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-muted">Loading...</div>
      </div>
    )
  }

  if (user) {
    return null
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-block mb-6">
            <Image
              src="/logo.png"
              alt="Wallet Joy"
              width={120}
              height={120}
              priority
            />
          </div>
          <h1 className="text-3xl font-bold text-foreground mb-2">
            Wallet Joy
          </h1>
          <p className="text-muted text-sm">
            Manage your finances together
          </p>
        </div>

        <Card>
          <CardContent className="p-8">
            {signupSuccess ? (
              <div className="text-center space-y-4">
                <div className="w-16 h-16 mx-auto bg-success-light rounded-full flex items-center justify-center mb-4">
                  <svg className="w-8 h-8 text-success" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h3 className="text-xl font-semibold text-foreground">Check your email</h3>
                <p className="text-muted text-sm">
                  We've sent you a confirmation link. Please check your inbox.
                </p>
                <Button
                  variant="ghost"
                  onClick={() => {
                    setSignupSuccess(false)
                    setIsLogin(true)
                  }}
                  className="mt-4"
                >
                  Back to login
                </Button>
              </div>
            ) : (
              <>
                {/* Simple Tab Switcher */}
                <div className="flex border-b border-border mb-6">
                  <button
                    onClick={() => {
                      setIsLogin(true)
                      setError('')
                    }}
                    className={`flex-1 pb-3 text-sm font-medium transition-colors border-b-2 ${
                      isLogin
                        ? 'border-primary text-foreground'
                        : 'border-transparent text-muted hover:text-foreground'
                    }`}
                  >
                    Login
                  </button>
                  <button
                    onClick={() => {
                      setIsLogin(false)
                      setError('')
                    }}
                    className={`flex-1 pb-3 text-sm font-medium transition-colors border-b-2 ${
                      !isLogin
                        ? 'border-primary text-foreground'
                        : 'border-transparent text-muted hover:text-foreground'
                    }`}
                  >
                    Sign Up
                  </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                  {!isLogin && (
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">
                        Full Name
                      </label>
                      <Input
                        type="text"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        placeholder="John Doe"
                        required={!isLogin}
                      />
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Email
                    </label>
                    <Input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@example.com"
                      required
                      error={!!error}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Password
                    </label>
                    <Input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter your password"
                      required
                      error={!!error}
                      helperText={error}
                    />
                  </div>

                  <Button
                    type="submit"
                    isLoading={loading}
                    className="w-full mt-6"
                    size="lg"
                  >
                    {isLogin ? 'Sign In' : 'Create Account'}
                  </Button>
                </form>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
