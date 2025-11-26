'use client'

import { useState } from 'react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import Icon from '@/components/icons/Icon'
import { createClient } from '@/utils/supabase/client'

interface WelcomeTourProps {
  onClose: () => void
}

export default function WelcomeTour({ onClose }: WelcomeTourProps) {
  const [step, setStep] = useState(0)
  const [loading, setLoading] = useState(false)

  const steps = [
    {
      title: "Welcome to Wallet Joy",
      description: "Your new financial home. Track expenses, manage budgets, and achieve your goals.",
      icon: "home" as const,
      color: "text-primary"
    },
    {
      title: "Track Everything",
      description: "Log transactions easily. Categorize them to see exactly where your money goes.",
      icon: "transactions" as const,
      color: "text-blue-500"
    },
    {
      title: "Stay on Top",
      description: "Set budgets and get insights with beautiful reports. You're in control.",
      icon: "chart" as const,
      color: "text-purple-500"
    }
  ]

  const handleComplete = async () => {
    setLoading(true)
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      
      if (user) {
        await supabase
          .from('profiles')
          .update({ has_seen_welcome_tour: true })
          .eq('id', user.id)
      }
      
      onClose()
    } catch (error) {
      console.error('Error updating profile:', error)
      onClose()
    } finally {
      setLoading(false)
    }
  }

  const handleNext = () => {
    if (step < steps.length - 1) {
      setStep(step + 1)
    } else {
      handleComplete()
    }
  }

  const currentStepData = steps[step]

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-300">
      <Card variant="glass" className="w-full max-w-md overflow-hidden relative">
        <button 
          onClick={handleComplete}
          className="absolute top-4 right-4 text-muted hover:text-foreground transition-colors"
        >
          <Icon name="close" size={24} />
        </button>

        <div className="p-8 text-center">
          <div className={`w-24 h-24 mx-auto mb-6 rounded-full bg-surface-alt flex items-center justify-center ${currentStepData.color}`}>
            <Icon name={currentStepData.icon} size={48} />
          </div>

          <h2 className="text-2xl font-bold text-foreground mb-3">
            {currentStepData.title}
          </h2>
          <p className="text-muted text-lg mb-8 min-h-[3.5rem]">
            {currentStepData.description}
          </p>

          <div className="flex justify-center gap-2 mb-8">
            {steps.map((_, i) => (
              <div 
                key={i}
                className={`w-2.5 h-2.5 rounded-full transition-all duration-300 ${
                  i === step ? 'bg-primary w-6' : 'bg-surface-alt'
                }`}
              />
            ))}
          </div>

          <Button 
            size="lg" 
            className="w-full" 
            onClick={handleNext}
            disabled={loading}
          >
            {step === steps.length - 1 ? (loading ? 'Finishing...' : "Let's Go!") : 'Next'}
          </Button>
        </div>
      </Card>
    </div>
  )
}
