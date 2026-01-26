'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { signIn, signOut } from 'next-auth/react'
import { useI18n } from '@/lib/i18n'
import { useNotifications } from '@/lib/notifications'
import { clearStoredSession } from '@/lib/client-session'
import NotificationSettings from '@/components/NotificationSettings'

export default function ConfiguracioPage() {
  const [linkedProviders, setLinkedProviders] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [unlinking, setUnlinking] = useState(false)
  const [changing, setChanging] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const router = useRouter()
  const { t } = useI18n()
  const { showError, showInfo } = useNotifications()

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
      await fetch('/api/auth/logout', { method: 'POST' }).catch(() => null)
      clearStoredSession()
      await signOut({ redirect: false })
      router.replace('/')
      return
    } catch {
      showError(t('common.error'), t('config.unlinkGoogleError'))
    } finally {
      setUnlinking(false)
    }
  }

  const handleChangeGoogle = async () => {
    if (!window.confirm(t('config.changeGoogleConfirm'))) return
    setChanging(true)
    try {
      const res = await fetch('/api/auth/unlink-google', { method: 'POST' })
      const data = await res.json()
      if (!res.ok) {
        showError(t('common.error'), data?.error ?? t('config.changeGoogleError'))
        return
      }
      await fetch('/api/auth/logout', { method: 'POST' }).catch(() => null)
      clearStoredSession()
      await signOut({ redirect: false })
      signIn('google', { callbackUrl: '/app' })
      return
    } catch {
      showError(t('common.error'), t('config.changeGoogleError'))
    } finally {
      setChanging(false)
    }
  }

  const handleExportData = async () => {
    setExporting(true)
    try {
      const res = await fetch('/api/gdpr/export')
      if (!res.ok) {
        const data = await res.json()
        showError(t('common.error'), data?.error ?? t('legal.gdpr.exportError'))
        return
      }
      const blob = await res.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `xarxa-anglesola-dades-${Date.now()}.json`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
      showInfo(t('legal.gdpr.exportSuccess'), '')
    } catch {
      showError(t('common.error'), t('legal.gdpr.exportError'))
    } finally {
      setExporting(false)
    }
  }

  const handleDeleteAccount = async () => {
    if (!window.confirm(t('legal.gdpr.deleteConfirm'))) return
    setDeleting(true)
    try {
      const res = await fetch('/api/gdpr/delete', { method: 'DELETE' })
      const data = await res.json()
      if (!res.ok) {
        showError(t('common.error'), data?.error ?? t('legal.gdpr.deleteError'))
        return
      }
      clearStoredSession()
      await signOut({ redirect: false })
      router.replace('/')
    } catch {
      showError(t('common.error'), t('legal.gdpr.deleteError'))
    } finally {
      setDeleting(false)
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
                onClick={handleChangeGoogle}
                disabled={unlinking || changing}
                className="text-sm text-blue-600 dark:text-blue-400 hover:underline disabled:opacity-50"
              >
                {changing ? t('common.loading') : t('config.changeGoogle')}
              </button>
              <button
                type="button"
                onClick={handleUnlinkGoogle}
                disabled={unlinking || changing}
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

      <section className="mt-8">
        <h2 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
          {t('config.gdpr.title')}
        </h2>
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 space-y-4">
          <div>
            <p className="text-sm text-gray-700 dark:text-gray-300 mb-2">
              {t('config.gdpr.exportDescription')}
            </p>
            <button
              type="button"
              onClick={handleExportData}
              disabled={exporting}
              className="text-sm bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {exporting ? t('common.loading') : t('legal.gdpr.exportData')}
            </button>
          </div>
          <div className="border-t dark:border-gray-700 pt-4">
            <p className="text-sm text-gray-700 dark:text-gray-300 mb-2">
              {t('config.gdpr.deleteDescription')}
            </p>
            <button
              type="button"
              onClick={handleDeleteAccount}
              disabled={deleting}
              className="text-sm bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {deleting ? t('common.loading') : t('legal.gdpr.deleteAccount')}
            </button>
          </div>
        </div>
      </section>
    </div>
  )
}
