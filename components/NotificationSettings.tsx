'use client'

import { useState, useEffect } from 'react'
import { useI18n } from '@/lib/i18n'
import { useNotifications } from '@/lib/notifications'

export default function NotificationSettings() {
  const [permission, setPermission] = useState<NotificationPermission>('default')
  const { t } = useI18n()
  const { requestPermission, showSuccess, showError } = useNotifications()

  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window && window.Notification) {
      setPermission(window.Notification.permission)
    }
  }, [])

  const handleRequestPermission = async () => {
    const granted = await requestPermission()
    if (granted) {
      setPermission('granted')
      showSuccess(
        t('notifications.notificationsEnabled') || 'Notificacions activades',
        t('notifications.notificationsEnabledMessage') || 'Ara rebràs notificacions del navegador.'
      )
    } else {
      setPermission('denied')
      showError(
        t('notifications.notificationsDisabled') || 'Notificacions desactivades',
        t('notifications.notificationsDisabledMessage') || 'Has denegat els permisos de notificació. Pots activar-les des de la configuració del navegador.'
      )
    }
  }

  if (typeof window === 'undefined' || !('Notification' in window) || !window.Notification) {
    return null
  }

  if (permission === 'granted') {
    return (
      <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400">
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
          <path d="M10 2a6 6 0 00-6 6v3.586l-.707.707A1 1 0 004 14h12a1 1 0 00.707-1.707L16 11.586V8a6 6 0 00-6-6zM10 18a3 3 0 01-3-3h6a3 3 0 01-3 3z" />
        </svg>
        <span>{t('notifications.enabled') || 'Notificacions activades'}</span>
      </div>
    )
  }

  return (
    <button
      onClick={handleRequestPermission}
      className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition"
      title={t('notifications.enableNotifications') || 'Activar notificacions'}
    >
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
        />
      </svg>
      <span>{t('notifications.enableNotifications') || 'Activar notificacions'}</span>
    </button>
  )
}
