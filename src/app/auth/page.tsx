'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'

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

  // Redirect if already logged in
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
        // Redirect to dashboard after successful login
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

  // Show loading while checking auth state
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-900 via-blue-900 to-teal-900">
        <div className="text-white text-xl">Loading...</div>
      </div>
    )
  }

  // If user is logged in, don't show this page (will redirect via useEffect)
  if (user) {
    return null
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-900 via-blue-900 to-teal-900 p-4">
      <div className="bg-white/10 backdrop-blur-lg rounded-2xl shadow-2xl p-8 w-full max-w-md border border-white/20">
        <h1 className="text-4xl font-bold text-white mb-2 text-center">
          Wallet Joy
        </h1>
        <p className="text-white/70 text-center mb-8">
          Manage your finances together
        </p>

        {signupSuccess ? (
          <div className="bg-green-500/20 border border-green-500/50 text-green-200 px-6 py-4 rounded-lg text-center space-y-3">
            <div className="text-4xl mb-2">✉️</div>
            <p className="font-semibold text-lg">Check your email!</p>
            <p className="text-sm">
              We've sent you a confirmation link. Click it to verify your account.
            </p>
            <button
              onClick={() => {
                setSignupSuccess(false)
                setIsLogin(true)
              }}
              className="mt-4 text-green-300 hover:text-green-100 underline text-sm"
            >
              Back to login
            </button>
          </div>
        ) : (
          <>
            <div className="flex gap-2 mb-6">
              <button
                onClick={() => setIsLogin(true)}
                className={`flex-1 py-2 rounded-lg font-medium transition-all ${
                  isLogin
                    ? 'bg-white text-purple-900 shadow-lg'
                    : 'text-white/70 hover:text-white'
                }`}
              >
                Login
              </button>
              <button
                onClick={() => setIsLogin(false)}
                className={`flex-1 py-2 rounded-lg font-medium transition-all ${
                  !isLogin
                    ? 'bg-white text-purple-900 shadow-lg'
                    : 'text-white/70 hover:text-white'
                }`}
              >
                Sign Up
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {!isLogin && (
                <div>
                  <label className="block text-white/90 text-sm font-medium mb-2">
                    Full Name
                  </label>
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full px-4 py-3 rounded-lg bg-white/10 border border-white/20 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-white/50 focus:border-transparent"
                    placeholder="John Doe"
                    required={!isLogin}
                  />
                </div>
              )}

              <div>
                <label className="block text-white/90 text-sm font-medium mb-2">
                  Email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-3 rounded-lg bg-white/10 border border-white/20 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-white/50 focus:border-transparent"
                  placeholder="you@example.com"
                  required
                />
              </div>

              <div>
                <label className="block text-white/90 text-sm font-medium mb-2">
                  Password
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-3 rounded-lg bg-white/10 border border-white/20 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-white/50 focus:border-transparent"
                  placeholder="••••••••"
                  required
                />
              </div>

              {error && (
                <div className="bg-red-500/20 border border-red-500/50 text-red-200 px-4 py-3 rounded-lg text-sm">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-purple-500 to-pink-500 text-white font-bold py-3 rounded-lg hover:from-purple-600 hover:to-pink-600 transition-all shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Loading...' : isLogin ? 'Sign In' : 'Create Account'}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  )
}
