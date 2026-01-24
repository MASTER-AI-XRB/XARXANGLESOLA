'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useI18n } from '@/lib/i18n'
import { useNotifications } from '@/lib/notifications'
import NotificationSettings from '@/components/NotificationSettings'

export default function ConfiguracioPage() {
  const [linkedProviders, setLinkedProviders] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [unlinking, setUnlinking] = useState(false)
  const { t } = useI18n()
  const { showSuccess, showError } = useNotifications()

  useEffect(() => {
    fetch('/api/auth/linked-accounts')
      .then(async (res) => {
        if (!res.ok) return
        const data = await res.json()
        setLinkedProviders(data?.providers ?? [])
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const hasGoogle = linkedProviders.includes('google')

  const handleUnlinkGoogle = async () => {
    if (!window.confirm(t('config.unlinkGoogleConfirm'))) return
    setUnlinking(true)
    try {
      const res = await fetch('/api/auth/unlink-google', { method: 'POST' })
      const data = await res.json()
      if (!res.ok) {
        showError(t('common.error'), data?.error ?? t('config.unlinkGoogleError'))
        return
      }
      setLinkedProviders((prev) => prev.filter((p) => p !== 'google'))
      showSuccess(t('config.unlinkGoogleSuccess'), '')
    } catch {
      showError(t('common.error'), t('config.unlinkGoogleError'))
    } finally {
      setUnlinking(false)
    }
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-6">
      <Link
        href="/app"
        className="inline-flex items-center text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 text-sm mb-4"
      >
        ← {t('common.back')}
      </Link>
      <h1 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">
        {t('config.title')}
      </h1>

      <section className="mb-8">
        <h2 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
          {t('notifications.preferencesTitle')}
        </h2>
        <NotificationSettings />
      </section>

      <section>
        <h2 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
          {t('config.account')}
        </h2>
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
          {loading ? (
            <p className="text-sm text-gray-500 dark:text-gray-400">{t('config.loading')}</p>
          ) : hasGoogle ? (
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-sm text-gray-700 dark:text-gray-300">
                {t('config.googleLinked')}
              </span>
              <button
                type="button"
                onClick={handleUnlinkGoogle}
                disabled={unlinking}
                className="text-sm text-red-600 dark:text-red-400 hover:underline disabled:opacity-50"
              >
                {unlinking ? t('common.loading') : t('config.unlinkGoogle')}
              </button>
            </div>
          ) : (
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {t('config.noGoogleLinked')}
            </p>
          )}
        </div>
      </section>
    </div>
  )
}
