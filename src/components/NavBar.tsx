'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import Image from 'next/image'
import { useAuth } from '@/contexts/AuthContext'
import { useTheme } from '@/contexts/ThemeContext'
import { useState } from 'react'
import Icon, { IconName } from '@/components/icons/Icon'

import UserMenu from '@/components/UserMenu'

export default function NavBar() {
  const pathname = usePathname()
  const router = useRouter()
  const { user, signOut } = useAuth()
  const { theme, toggleTheme } = useTheme()
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [isSigningOut, setIsSigningOut] = useState(false)

  const navigation: { name: string; href: string; icon: IconName }[] = [
    { name: 'Dashboard', href: '/dashboard', icon: 'dashboard' },
    { name: 'Transactions', href: '/transactions', icon: 'transactions' },
    { name: 'Budgets', href: '/budgets', icon: 'chart' },
    { name: 'Goals', href: '/goals', icon: 'savings' },
    { name: 'Recurring', href: '/recurring', icon: 'calendar' },
    { name: 'Reports', href: '/reports', icon: 'reports' },
  ]

  const handleSignOut = async () => {
    setIsSigningOut(true)
    try {
      await signOut()
      router.push('/auth')
    } catch (error) {
      console.error('Sign out error:', error)
      setIsSigningOut(false)
    }
  }

  if (!user) return null

  return (
    <nav className="sticky top-0 z-40 bg-surface border-b border-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link href="/dashboard" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
            <Image src="/logo.png" alt="Wallet Joy" width={32} height={32} />
            <span className="text-lg font-semibold text-foreground hidden sm:block">Wallet Joy</span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-1">
            {navigation.map((item) => {
              const isActive = pathname === item.href || pathname?.startsWith(item.href + '/')
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center ${
                    isActive
                      ? 'bg-primary/10 text-primary'
                      : 'text-muted hover:text-foreground hover:bg-surface-alt'
                  }`}
                >
                  <Icon name={item.icon} size={18} className="mr-2" />
                  {item.name}
                </Link>
              )
            })}
          </div>

          {/* Right side actions */}
          <div className="flex items-center gap-3">
            {/* Desktop User Menu */}
            <div className="hidden md:block">
              <UserMenu />
            </div>

            {/* Mobile menu button */}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="md:hidden p-2 rounded-lg hover:bg-background transition-colors"
              aria-label="Toggle menu"
            >
              <Icon name={isMobileMenuOpen ? 'close' : 'dashboard'} size={24} /> 
              {/* Note: Using 'dashboard' as hamburger/menu icon proxy if 'menu' not avail, or just SVG */}
               {isMobileMenuOpen ? (
                <svg className="w-6 h-6 text-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              ) : (
                <svg className="w-6 h-6 text-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              )}
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        {isMobileMenuOpen && (
          <div className="md:hidden py-4 border-t border-border animate-in slide-in-from-top-5 duration-200">
            <div className="space-y-1">
              {/* User Info Mobile */}
              <div className="px-4 py-2 mb-2 border-b border-border/50">
                <p className="text-sm font-medium text-foreground">{user.email}</p>
              </div>

              {navigation.map((item) => {
                const isActive = pathname === item.href || pathname?.startsWith(item.href + '/')
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={`block px-4 py-3 rounded-lg text-sm font-medium transition-all flex items-center ${
                      isActive
                        ? 'bg-primary/10 text-primary'
                        : 'text-muted hover:text-foreground hover:bg-surface-alt'
                    }`}
                  >
                    <Icon name={item.icon} size={18} className="mr-2" />
                    {item.name}
                  </Link>
                )
              })}

              {/* Mobile Theme Toggle */}
              <button
                onClick={toggleTheme}
                className="w-full flex items-center px-4 py-3 text-sm font-medium text-muted hover:text-foreground hover:bg-surface-alt transition-all rounded-lg"
              >
                <Icon name={theme === 'light' ? 'sun' : 'moon'} size={18} className="mr-2" />
                {theme === 'light' ? 'Switch to Dark Mode' : 'Switch to Light Mode'}
              </button>

              <button
                onClick={handleSignOut}
                disabled={isSigningOut}
                className="w-full flex items-center px-4 py-3 text-sm font-medium text-red-500 hover:bg-red-500/10 transition-all rounded-lg disabled:opacity-50"
              >
                <Icon name="logout" size={18} className="mr-2" />
                {isSigningOut ? 'Signing out...' : 'Sign Out'}
              </button>
            </div>
          </div>
        )}
      </div>
    </nav>
  )
}
