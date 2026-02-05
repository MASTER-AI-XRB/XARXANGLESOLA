'use client'

import { useEffect } from 'react'
import Image from 'next/image'
import { useI18n } from '@/lib/i18n'

export type NotificationIconType = 'prestec_on' | 'prestec_off' | 'reserve_on' | 'reserve_off'

export interface Notification {
  id: string
  type: 'info' | 'success' | 'warning' | 'error'
  title: string
  message: string
  duration?: number
  /** Tipus d’icona a la dreta (prèstec o reserva, actiu/inactiu) */
  notificationType?: string
  /** true = reserva/desreserva del propietari (icona blava); false/undefined = per DM (icona groga) */
  ownerReserve?: boolean
  action?: {
    label: string
    onClick: () => void
  }
}

interface NotificationToastProps {
  notification: Notification
  onClose: () => void
}

export default function NotificationToast({ notification, onClose }: NotificationToastProps) {
  const { t } = useI18n()

  useEffect(() => {
    const duration = notification.duration || 5000
    const timer = setTimeout(() => {
      onClose()
    }, duration)

    return () => clearTimeout(timer)
  }, [notification.duration, onClose])

  const typeStyles = {
    info: 'bg-blue-500 dark:bg-blue-600',
    success: 'bg-green-500 dark:bg-green-600',
    warning: 'bg-yellow-500 dark:bg-yellow-600',
    error: 'bg-red-500 dark:bg-red-600',
  }

  const iconPaths = {
    info: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    ),
    success: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    ),
    warning: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
      />
    ),
    error: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    ),
  }

  const notificationTypeToIcon = (nt?: string, ownerReserve?: boolean) => {
    if (!nt) return null
    const isOwnerReserve = ownerReserve === true
    if (nt === 'loan_started') {
      return (
        <span className="flex items-center justify-center w-8 h-8 rounded-full bg-green-500 shrink-0 p-1.5" aria-hidden>
          <Image src="/prestec_on.png" alt="" width={20} height={20} className="object-contain" />
        </span>
      )
    }
    if (nt === 'loan_ended') {
      return (
        <span className="flex items-center justify-center w-8 h-8 rounded-full bg-white/25 shrink-0 p-1.5" aria-hidden>
          <Image src="/prestec_off.png" alt="" width={20} height={20} className="object-contain opacity-95" />
        </span>
      )
    }
    if (nt === 'reserved_favorite') {
      return (
        <span
          className={`flex items-center justify-center w-8 h-8 rounded-full text-white shrink-0 p-1.5 ${isOwnerReserve ? 'bg-blue-500' : 'bg-yellow-500'}`}
          aria-hidden
        >
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            <path d="M5 4a2 2 0 012-2h6a2 2 0 012 2v14l-5-2.5L5 18V4z" />
          </svg>
        </span>
      )
    }
    if (nt === 'unreserved_favorite') {
      return (
        <span
          className={`flex items-center justify-center w-8 h-8 rounded-full border-2 shrink-0 p-1.5 ${
            isOwnerReserve ? 'border-blue-400 bg-white/20 text-blue-200' : 'border-yellow-400 bg-white/20 text-yellow-200'
          }`}
          aria-hidden
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
          </svg>
        </span>
      )
    }
    return null
  }

  return (
    <div className="max-w-sm w-full animate-slide-in-right pointer-events-auto">
      <div
        className={`${typeStyles[notification.type]} text-white rounded-lg shadow-lg p-4 flex items-start gap-3 cursor-default`}
      >
        <div className="flex-shrink-0">
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            {iconPaths[notification.type]}
          </svg>
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="font-semibold text-sm mb-1">{notification.title}</h4>
          <p className="text-sm opacity-90">{notification.message}</p>
          {notification.action && (
            <button
              onClick={notification.action.onClick}
              className="mt-2 text-sm underline hover:no-underline"
            >
              {notification.action.label}
            </button>
          )}
        </div>
        {notificationTypeToIcon(notification.notificationType, notification.ownerReserve) && (
          <div className="flex-shrink-0 flex items-center">
            {notificationTypeToIcon(notification.notificationType, notification.ownerReserve)}
          </div>
        )}
        <button
          onClick={onClose}
          className="flex-shrink-0 opacity-75 hover:opacity-100 transition"
          aria-label={t('common.close')}
        >
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      </div>
    </div>
  )
}
