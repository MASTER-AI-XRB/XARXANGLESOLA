'use client'

import { useEffect, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { signOut, useSession } from 'next-auth/react'
import { useI18n } from '@/lib/i18n'
import LanguageSelector from '@/components/LanguageSelector'
import ThemeToggle from '@/components/ThemeToggle'
import { AppSocketProvider } from '@/components/AppSocketProvider'
import { clearStoredSession, getStoredNickname, setStoredSession } from '@/lib/client-session'
import DevConsole from '@/components/DevConsole'
import { NavNotificationsBell } from '@/components/NavNotificationsBell'
import { AppInfoPopup } from '@/components/AppInfoPopup'
import { MobileNavCarousel } from '@/components/MobileNavCarousel'
import { OnboardingProvider, useOnboarding } from '@/lib/onboarding-context'

export default function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [nickname, setNickname] = useState<string | null>(null)
  const [socketReady, setSocketReady] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const router = useRouter()
  const pathname = usePathname()
  const sessionHook = useSession()
  const { data: session, status } = sessionHook ?? { data: null, status: 'loading' as const }
  const { t } = useI18n()

  useEffect(() => {
    const savedNickname = getStoredNickname()
    if (!savedNickname) {
      if (pathname === '/app/complete-profile') {
        return
      }
      if (status === 'loading') {
        return
      }
      if (!session) {
        router.push('/')
        return
      }
      fetch('/api/auth/socket-token')
        .then(async (response) => {
          const data = await response.json()
          if (!response.ok) {
            router.push('/')
            return
          }
          if (data?.needsNickname) {
            router.push('/app/complete-profile')
            return
          }
          if (data?.nickname) {
            setStoredSession(data.nickname, data.socketToken)
            setNickname(data.nickname)
            setSocketReady(true)
            return
          }
          router.push('/')
        })
        .catch(() => {
          router.push('/')
        })
      return
    }
    setNickname(savedNickname)
  }, [router, pathname, session, status])

  // Refrescar token del socket quan l’usuari ja tenia nickname a localStorage (token pot estar caducat)
  useEffect(() => {
    if (!nickname || socketReady) return
    fetch('/api/auth/socket-token')
      .then(async (response) => {
        const data = await response.json()
        if (response.ok && data?.nickname && data?.socketToken) {
          setStoredSession(data.nickname, data.socketToken)
          setSocketReady(true)
        } else {
          setSocketReady(true)
        }
      })
      .catch(() => setSocketReady(true))
  }, [nickname, socketReady])

  const handleLogout = () => {
    fetch('/api/auth/logout', { method: 'POST' }).catch(() => null)
    clearStoredSession()
    if (session) {
      signOut({ redirect: false }).catch(() => null)
    }
    router.push('/')
  }

  if (!nickname) {
    if (pathname === '/app/complete-profile') {
      return <main>{children}</main>
    }
    return null
  }

  return (
    <AppSocketProvider ready={socketReady}>
    <OnboardingProvider>
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <nav className="bg-white dark:bg-gray-800 shadow-sm border-b dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-2 sm:px-4 md:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center gap-2 md:gap-4">
            {/* Logo */}
            <Link href="/app" className="flex items-center shrink-0">
              <div className="rounded-full overflow-hidden p-0.5 sm:p-1">
                <Image
                  src="/xarxa_logo.jpg"
                  alt="Xarxa Anglesola"
                  width={40}
                  height={40}
                  className="h-7 w-7 sm:h-9 sm:w-9 md:h-10 md:w-10 rounded-full object-cover"
                  priority
                />
              </div>
            </Link>
            {/* Missatge de benvinguda a l'esquerra, sempre visible */}
            <span className="text-gray-700 dark:text-gray-300 text-xs sm:text-sm shrink-0 whitespace-nowrap ml-1">
              {t('nav.hello', { nickname })}
            </span>
            {/* Carrussel de navegació mòbil i tauleta: fletxes + scroll tàctil */}
            <MobileNavCarousel pathname={pathname} t={t} />
            {/* Menú desktop: icones repartides entre logo i tema */}
            <nav
              className="hidden md:flex flex-1 min-w-0 justify-evenly items-center gap-1 px-6"
              aria-label="Navegació principal"
            >
              <Link
                href="/app"
                className="group flex items-center justify-center rounded-lg p-2 text-gray-500 dark:text-gray-400 opacity-70 hover:opacity-100 hover:text-blue-600 dark:hover:text-blue-400 transition-all duration-200 ease-out hover:scale-110 hover:bg-gray-100/80 dark:hover:bg-gray-700/50 hover:shadow-[0_0_18px_rgba(59,130,246,0.4)] dark:hover:shadow-[0_0_18px_rgba(96,165,250,0.35)]"
                title={t('nav.products')}
                aria-label={t('nav.products')}
              >
                <svg className="h-5 w-5 transition-transform duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
                  </svg>
              </Link>
              <Link
                href="/app/favorites"
                className="group flex items-center justify-center rounded-lg p-2 text-gray-500 dark:text-gray-400 opacity-70 hover:opacity-100 hover:text-blue-600 dark:hover:text-blue-400 transition-all duration-200 ease-out hover:scale-110 hover:bg-gray-100/80 dark:hover:bg-gray-700/50 hover:shadow-[0_0_18px_rgba(59,130,246,0.4)] dark:hover:shadow-[0_0_18px_rgba(96,165,250,0.35)]"
                title={t('nav.favorites')}
                aria-label={t('nav.favorites')}
              >
                <svg className="h-5 w-5 transition-transform duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                  </svg>
              </Link>
              <Link
                href="/app/my-products"
                className="group flex items-center justify-center rounded-lg p-2 text-gray-500 dark:text-gray-400 opacity-70 hover:opacity-100 hover:text-blue-600 dark:hover:text-blue-400 transition-all duration-200 ease-out hover:scale-110 hover:bg-gray-100/80 dark:hover:bg-gray-700/50 hover:shadow-[0_0_18px_rgba(59,130,246,0.4)] dark:hover:shadow-[0_0_18px_rgba(96,165,250,0.35)]"
                title={t('nav.myProducts')}
                aria-label={t('nav.myProducts')}
              >
                <svg className="h-5 w-5 transition-transform duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                  </svg>
              </Link>
              <Link
                href="/app/chat"
                className="group flex items-center justify-center rounded-lg p-2 text-gray-500 dark:text-gray-400 opacity-70 hover:opacity-100 hover:text-blue-600 dark:hover:text-blue-400 transition-all duration-200 ease-out hover:scale-110 hover:bg-gray-100/80 dark:hover:bg-gray-700/50 hover:shadow-[0_0_18px_rgba(59,130,246,0.4)] dark:hover:shadow-[0_0_18px_rgba(96,165,250,0.35)]"
                title={t('nav.chat')}
                aria-label={t('nav.chat')}
              >
                <svg className="h-5 w-5 transition-transform duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
              </Link>
              <Link
                href="/app/configuracio"
                className="group flex items-center justify-center rounded-lg p-2 text-gray-500 dark:text-gray-400 opacity-70 hover:opacity-100 hover:text-blue-600 dark:hover:text-blue-400 transition-all duration-200 ease-out hover:scale-110 hover:bg-gray-100/80 dark:hover:bg-gray-700/50 hover:shadow-[0_0_18px_rgba(59,130,246,0.4)] dark:hover:shadow-[0_0_18px_rgba(96,165,250,0.35)]"
                title={t('nav.settings')}
                aria-label={t('nav.settings')}
              >
                <svg className="h-5 w-5 transition-transform duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
              </Link>
            </nav>
            <div className="flex items-center gap-1 sm:gap-2 shrink-0 min-w-0">
              <div className="hidden md:flex items-center gap-1 shrink-0">
                <ThemeToggle />
                <LanguageSelector />
              </div>
              <AppInfoPopup />
              <NavNotificationsBell />
              <button
                onClick={handleLogout}
                className="hidden md:flex items-center justify-center w-9 h-9 rounded-full bg-red-500 text-white hover:bg-red-600 transition shrink-0"
                title={t('nav.logout')}
                aria-label={t('nav.logout')}
              >
                <span className="text-lg leading-none" aria-hidden>⏻</span>
              </button>
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="flex md:hidden p-2 rounded-md text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-gray-100 dark:hover:bg-gray-700"
                aria-label={mobileMenuOpen ? t('nav.closeMenu') : t('nav.openMenu')}
              >
                <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  {mobileMenuOpen ? (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  ) : (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                  )}
                </svg>
              </button>
            </div>
          </div>
          {/* Menú mòbil */}
          {mobileMenuOpen && (
            <div className="md:hidden border-t dark:border-gray-700 py-4">
              <div className="flex items-center gap-2 px-3 pb-3 mb-2 border-b dark:border-gray-700">
                <ThemeToggle />
                <LanguageSelector />
                <button
                  onClick={() => {
                    setMobileMenuOpen(false)
                    handleLogout()
                  }}
                  className="ml-auto flex items-center justify-center w-9 h-9 rounded-full bg-red-500 text-white hover:bg-red-600 transition shrink-0"
                  title={t('nav.logout')}
                  aria-label={t('nav.logout')}
                >
                  <span className="text-lg leading-none" aria-hidden>⏻</span>
                </button>
              </div>
              <div className="flex flex-col space-y-2">
                <Link
                  href="/app"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-3 text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-gray-100 dark:hover:bg-gray-700 px-3 py-2 rounded-md text-sm font-medium transition"
                  aria-label={t('nav.products')}
                >
                  <svg className="h-5 w-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
                  </svg>
                  {t('nav.products')}
                </Link>
                <Link
                  href="/app/favorites"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-3 text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-gray-100 dark:hover:bg-gray-700 px-3 py-2 rounded-md text-sm font-medium transition"
                  aria-label={t('nav.favorites')}
                >
                  <svg className="h-5 w-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                  </svg>
                  {t('nav.favorites')}
                </Link>
                <Link
                  href="/app/my-products"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-3 text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-gray-100 dark:hover:bg-gray-700 px-3 py-2 rounded-md text-sm font-medium transition"
                  aria-label={t('nav.myProducts')}
                >
                  <svg className="h-5 w-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                  </svg>
                  {t('nav.myProducts')}
                </Link>
                <Link
                  href="/app/chat"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-3 text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-gray-100 dark:hover:bg-gray-700 px-3 py-2 rounded-md text-sm font-medium transition"
                  aria-label={t('nav.chat')}
                >
                  <svg className="h-5 w-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                  {t('nav.chat')}
                </Link>
                <Link
                  href="/app/configuracio"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-3 text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-gray-100 dark:hover:bg-gray-700 px-3 py-2 rounded-md text-sm font-medium transition"
                  aria-label={t('nav.settings')}
                >
                  <svg className="h-5 w-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  {t('nav.settings')}
                </Link>
              </div>
            </div>
          )}
        </div>
      </nav>
      <AppMain>{children}</AppMain>
      <DevConsole />
    </div>
    </OnboardingProvider>
    </AppSocketProvider>
  )
}

function AppMain({ children }: { children: React.ReactNode }) {
  const { isOnboardingActive } = useOnboarding()
  return (
    <main className={isOnboardingActive ? 'hidden' : undefined}>
      {children}
    </main>
  )
}

