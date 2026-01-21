'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { useI18n } from '@/lib/i18n'
import LanguageSelector from '@/components/LanguageSelector'
import ThemeToggle from '@/components/ThemeToggle'
import NotificationSettings from '@/components/NotificationSettings'
import DevConsole from '@/components/DevConsole'

export default function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [nickname, setNickname] = useState<string | null>(null)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const router = useRouter()
  const { t } = useI18n()

  useEffect(() => {
    const savedNickname = localStorage.getItem('nickname')
    if (!savedNickname) {
      router.push('/')
      return
    }
    setNickname(savedNickname)
  }, [router])

  const handleLogout = () => {
    localStorage.removeItem('nickname')
    localStorage.removeItem('userId')
    router.push('/')
  }

  if (!nickname) {
    return null
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <nav className="bg-white dark:bg-gray-800 shadow-sm border-b dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <div className="flex items-center gap-2 sm:gap-0">
              <Link href="/app" className="flex items-center">
                <div className="rounded-full overflow-hidden p-1">
                  <Image 
                    src="/xarxa_logo.jpg" 
                    alt="Xarxa Anglesola" 
                    width={40}
                    height={40}
                    className="h-8 w-8 sm:h-10 sm:w-10 rounded-full object-cover"
                    priority
                  />
                </div>
              </Link>
              {/* Selector d'idioma i tema mòbil */}
              <div className="sm:hidden flex items-center gap-1">
                <ThemeToggle />
                <LanguageSelector />
              </div>
              {/* Menú desktop */}
              <div className="hidden md:flex md:ml-8 md:space-x-4">
                <Link
                  href="/app"
                  className="text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 px-3 py-2 rounded-md text-sm font-medium"
                >
                  {t('nav.products')}
                </Link>
                <Link
                  href="/app/favorites"
                  className="text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 px-3 py-2 rounded-md text-sm font-medium"
                >
                  {t('nav.favorites')}
                </Link>
                <Link
                  href="/app/my-products"
                  className="text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 px-3 py-2 rounded-md text-sm font-medium"
                >
                  {t('nav.myProducts')}
                </Link>
                <Link
                  href="/app/chat"
                  className="text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 px-3 py-2 rounded-md text-sm font-medium"
                >
                  {t('nav.chat')}
                </Link>
              </div>
            </div>
            <div className="flex items-center space-x-2 sm:space-x-4">
              <div className="hidden sm:flex items-center gap-2">
                <ThemeToggle />
                <LanguageSelector />
              </div>
              <span className="text-gray-700 dark:text-gray-300 text-xs sm:text-sm">{t('nav.hello', { nickname })}</span>
              <button
                onClick={handleLogout}
                className="bg-red-500 text-white px-2 sm:px-4 py-2 rounded-md text-xs sm:text-sm font-medium hover:bg-red-600"
              >
                {t('nav.logout')}
              </button>
              {/* Botó menú mòbil */}
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="md:hidden p-2 rounded-md text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-gray-100 dark:hover:bg-gray-700"
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
              <div className="flex flex-col space-y-2">
                <Link
                  href="/app"
                  onClick={() => setMobileMenuOpen(false)}
                  className="text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 px-3 py-2 rounded-md text-sm font-medium"
                >
                  {t('nav.products')}
                </Link>
                <Link
                  href="/app/favorites"
                  onClick={() => setMobileMenuOpen(false)}
                  className="text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 px-3 py-2 rounded-md text-sm font-medium"
                >
                  {t('nav.favorites')}
                </Link>
                <Link
                  href="/app/my-products"
                  onClick={() => setMobileMenuOpen(false)}
                  className="text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 px-3 py-2 rounded-md text-sm font-medium"
                >
                  {t('nav.myProducts')}
                </Link>
                <Link
                  href="/app/chat"
                  onClick={() => setMobileMenuOpen(false)}
                  className="text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 px-3 py-2 rounded-md text-sm font-medium"
                >
                  {t('nav.chat')}
                </Link>
                <div className="px-3 py-2">
                  <NotificationSettings />
                </div>
              </div>
            </div>
          )}
        </div>
      </nav>
      <main>{children}</main>
      <DevConsole />
    </div>
  )
}

