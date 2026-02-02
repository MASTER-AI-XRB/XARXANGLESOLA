'use client'

import { createContext, useContext, useState, useEffect, type ReactNode } from 'react'

const ONBOARDING_KEY = 'xarxa-onboarding-seen'

type OnboardingContextValue = {
  isOnboardingActive: boolean
  setOnboardingActive: (active: boolean) => void
}

const OnboardingContext = createContext<OnboardingContextValue | null>(null)

export function OnboardingProvider({ children }: { children: ReactNode }) {
  const [isOnboardingActive, setIsOnboardingActive] = useState(true)

  useEffect(() => {
    if (typeof window === 'undefined') return
    if (window.localStorage.getItem(ONBOARDING_KEY)) {
      setIsOnboardingActive(false)
    }
  }, [])

  return (
    <OnboardingContext.Provider value={{ isOnboardingActive, setOnboardingActive: setIsOnboardingActive }}>
      {children}
    </OnboardingContext.Provider>
  )
}

export function useOnboarding() {
  const ctx = useContext(OnboardingContext)
  if (!ctx) return { isOnboardingActive: false, setOnboardingActive: () => {} }
  return ctx
}
