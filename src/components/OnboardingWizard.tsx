'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import Icon from '@/components/icons/Icon'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/contexts/ToastContext'

type Step = 'welcome' | 'currency' | 'account' | 'complete'

export default function OnboardingWizard() {
  const router = useRouter()
  const { user } = useAuth()
  const { success: showSuccess, error: showError } = useToast()
  const [currentStep, setCurrentStep] = useState<Step>('welcome')
  const [loading, setLoading] = useState(false)
  
  // Form State
  const [currency, setCurrency] = useState('EUR')
  const [accountName, setAccountName] = useState('')
  const [accountBalance, setAccountBalance] = useState('')

  const handleCurrencySelect = (curr: string) => {
    setCurrency(curr)
    setCurrentStep('account')
  }

  const handleCreateAccount = async () => {
    if (!accountName || !accountBalance) {
      showError('Please fill in all fields')
      return
    }

    setLoading(true)
    try {
      // 1. Update User Preferences (Currency)
      // For now, we'll just assume this is handled or stored locally if we don't have a user_settings table yet.
      // But we should probably create the account first.
      
      // 2. Create Account
      const response = await fetch('/api/accounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: accountName,
          type: 'checking', // Default to checking
          balance: parseFloat(accountBalance),
          currency: currency
        })
      })

      if (!response.ok) {
        throw new Error('Failed to create account')
      }

      showSuccess('Setup complete!')
      setCurrentStep('complete')
      
      // Short delay before redirect
      setTimeout(() => {
        router.push('/dashboard')
      }, 1500)
    } catch (error) {
      console.error('Onboarding error:', error)
      showError('Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const renderStep = () => {
    switch (currentStep) {
      case 'welcome':
        return (
          <div className="text-center space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="w-20 h-20 bg-primary/20 rounded-full flex items-center justify-center mx-auto mb-6">
              <Icon name="piggy_bank" size={40} className="text-primary" />
            </div>
            <h1 className="text-3xl font-bold text-foreground">Welcome to Wallet Joy!</h1>
            <p className="text-muted text-lg max-w-md mx-auto">
              Take control of your finances with a simple, beautiful tracker. Let's get you set up in less than a minute.
            </p>
            <Button 
              size="lg" 
              className="w-full max-w-xs mx-auto mt-8"
              onClick={() => setCurrentStep('currency')}
            >
              Get Started
            </Button>
          </div>
        )

      case 'currency':
        return (
          <div className="space-y-6 animate-in fade-in slide-in-from-right-8 duration-300">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold text-foreground">Choose your currency</h2>
              <p className="text-muted">You can change this later in settings.</p>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {['EUR', 'USD', 'GBP'].map((curr) => (
                <button
                  key={curr}
                  onClick={() => handleCurrencySelect(curr)}
                  className={`p-6 rounded-xl border-2 transition-all hover:scale-105 ${
                    currency === curr 
                      ? 'border-primary bg-primary/5' 
                      : 'border-border hover:border-primary/50 bg-surface'
                  }`}
                >
                  <div className="text-3xl font-bold text-foreground mb-2">
                    {curr === 'EUR' ? '€' : curr === 'USD' ? '$' : '£'}
                  </div>
                  <div className="font-medium text-muted">{curr}</div>
                </button>
              ))}
            </div>
            
            <div className="flex justify-center mt-8">
              <button 
                onClick={() => setCurrentStep('welcome')}
                className="text-muted hover:text-foreground text-sm"
              >
                Back
              </button>
            </div>
          </div>
        )

      case 'account':
        return (
          <div className="space-y-6 animate-in fade-in slide-in-from-right-8 duration-300">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold text-foreground">Create your first account</h2>
              <p className="text-muted">Add a bank account, cash, or card to start tracking.</p>
            </div>

            <div className="space-y-4 max-w-sm mx-auto">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Account Name</label>
                <input
                  type="text"
                  placeholder="e.g. Main Checking"
                  value={accountName}
                  onChange={(e) => setAccountName(e.target.value)}
                  className="w-full px-4 py-3 rounded-lg bg-background border border-border focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Current Balance</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted font-medium">
                    {currency === 'EUR' ? '€' : currency === 'USD' ? '$' : '£'}
                  </span>
                  <input
                    type="number"
                    placeholder="0.00"
                    value={accountBalance}
                    onChange={(e) => setAccountBalance(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 rounded-lg bg-background border border-border focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all"
                  />
                </div>
              </div>

              <Button 
                size="lg" 
                className="w-full mt-6"
                onClick={handleCreateAccount}
                disabled={loading}
              >
                {loading ? 'Setting up...' : 'Complete Setup'}
              </Button>
              
              <div className="text-center">
                <button 
                  onClick={() => setCurrentStep('currency')}
                  className="text-muted hover:text-foreground text-sm"
                  disabled={loading}
                >
                  Back
                </button>
              </div>
            </div>
          </div>
        )

      case 'complete':
        return (
          <div className="text-center space-y-6 animate-in zoom-in duration-500">
            <div className="w-20 h-20 bg-success/20 rounded-full flex items-center justify-center mx-auto mb-6">
              <Icon name="check" size={40} className="text-success" />
            </div>
            <h1 className="text-3xl font-bold text-foreground">All Set!</h1>
            <p className="text-muted text-lg">
              Redirecting you to your dashboard...
            </p>
          </div>
        )
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card variant="glass" className="w-full max-w-2xl p-8 md:p-12 relative overflow-hidden">
        {/* Progress Bar */}
        {currentStep !== 'welcome' && currentStep !== 'complete' && (
          <div className="absolute top-0 left-0 w-full h-1 bg-surface-alt">
            <div 
              className="h-full bg-primary transition-all duration-500"
              style={{ 
                width: currentStep === 'currency' ? '50%' : '90%' 
              }}
            />
          </div>
        )}
        
        {renderStep()}
      </Card>
    </div>
  )
}
