'use client'

import { useState, useEffect } from 'react'
import { useI18n } from '@/lib/i18n'
import Link from 'next/link'

const COOKIE_CONSENT_KEY = 'cookie_consent'

export default function CookieBanner() {
  const [showBanner, setShowBanner] = useState(false)
  const { t } = useI18n()

  useEffect(() => {
    // Comprovar si ja s'ha donat consentiment
    const consent = localStorage.getItem(COOKIE_CONSENT_KEY)
    if (!consent) {
      setShowBanner(true)
    }
  }, [])

  const handleAccept = () => {
    localStorage.setItem(COOKIE_CONSENT_KEY, 'accepted')
    setShowBanner(false)
  }

  const handleReject = () => {
    localStorage.setItem(COOKIE_CONSENT_KEY, 'rejected')
    setShowBanner(false)
    // Aquí es podria implementar lògica per desactivar cookies no essencials
  }

  if (!showBanner) return null

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-white dark:bg-gray-800 border-t dark:border-gray-700 shadow-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex-1">
            <p className="text-sm text-gray-700 dark:text-gray-300">
              {t('legal.cookies.message')}{' '}
              <Link
                href="/privacy"
                className="text-blue-600 dark:text-blue-400 hover:underline"
              >
                {t('legal.cookies.learnMore')}
              </Link>
            </p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={handleReject}
              className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition"
            >
              {t('legal.cookies.reject')}
            </button>
            <button
              onClick={handleAccept}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition"
            >
              {t('legal.cookies.accept')}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
