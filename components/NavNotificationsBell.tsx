'use client'

import { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useRouter } from 'next/navigation'
import { useNotifications } from '@/lib/notifications'
import { useI18n } from '@/lib/i18n'
import NotificationSettings from '@/components/NotificationSettings'

function NotificationTypeIcon({ notificationType, ownerReserve }: { notificationType?: string; ownerReserve?: boolean }) {
  if (!notificationType) return null
  const isOwnerReserve = ownerReserve === true
  if (notificationType === 'loan_started') {
    return (
      <span className="flex items-center justify-center w-8 h-8 rounded-full bg-green-500 text-white shrink-0 p-1.5" aria-hidden>
        <img src="/prestec_on.png" alt="" className="w-full h-full object-contain" width={20} height={20} />
      </span>
    )
  }
  if (notificationType === 'loan_ended') {
    return (
      <span className="flex items-center justify-center w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-600 shrink-0 p-1.5" aria-hidden>
        <img src="/prestec_off.png" alt="" className="w-full h-full object-contain opacity-90" width={20} height={20} />
      </span>
    )
  }
  if (notificationType === 'reserved_favorite') {
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
  if (notificationType === 'unreserved_favorite') {
    return (
      <span
        className={`flex items-center justify-center w-8 h-8 rounded-full border-2 shrink-0 p-1.5 ${
          isOwnerReserve
            ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400'
            : 'border-yellow-500 bg-yellow-50 dark:bg-yellow-900/20 text-yellow-600 dark:text-yellow-400'
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

const DROPDOWN_GAP = 4

export function NavNotificationsBell() {
  const [open, setOpen] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const [anchorRect, setAnchorRect] = useState<{ bottom: number; right: number } | null>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const { alerts, markAlertRead, markAllAlertsRead, removeAlert, removeAllAlerts } = useNotifications()
  const router = useRouter()
  const { t } = useI18n()

  const unreadCount = alerts.filter((a) => !a.read).length

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 768px)')
    setIsMobile(mq.matches)
    const handler = () => setIsMobile(mq.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])

  useEffect(() => {
    if (!open) return
    const handleClickOutside = (e: MouseEvent) => {
      if (
        panelRef.current &&
        !panelRef.current.contains(e.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(e.target as Node)
      ) {
        setOpen(false)
        setAnchorRect(null)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [open])

  const handleAlertClick = (id: string, url?: string) => {
    markAlertRead(id)
    setOpen(false)
        setAnchorRect(null)
    if (url) router.push(url)
  }

  return (
    <div className="relative flex items-center">
      <button
        ref={buttonRef}
        type="button"
        onClick={() => {
          if (!open && buttonRef.current && isMobile) {
            const rect = buttonRef.current.getBoundingClientRect()
            setAnchorRect({ bottom: rect.bottom, right: rect.right })
          }
          if (open) setAnchorRect(null)
          setOpen(!open)
        }}
        className="relative p-2 rounded-full text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition"
        title={t('nav.notifications')}
        aria-label={t('nav.notifications')}
        aria-expanded={open}
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
          />
        </svg>
        {unreadCount > 0 && (
          <span
            className="absolute top-0.5 right-0.5 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white dark:border-gray-800"
            aria-hidden
          />
        )}
      </button>
      {open && (() => {
        const panelContent = (
          <div
            ref={panelRef}
            className={
              isMobile && typeof document !== 'undefined' && anchorRect
                ? 'fixed z-[60] w-80 max-w-[calc(100vw-1rem)] max-h-[min(70vh,24rem)] overflow-hidden rounded-lg shadow-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 flex flex-col'
                : 'absolute right-0 top-full mt-2 w-80 max-h-[min(70vh,24rem)] overflow-hidden rounded-lg shadow-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 z-50 flex flex-col'
            }
            style={
              isMobile && anchorRect && typeof window !== 'undefined'
                ? {
                    top: anchorRect.bottom + DROPDOWN_GAP,
                    right: window.innerWidth - anchorRect.right,
                  }
                : undefined
            }
          >
            <div className="px-3 py-2 border-b dark:border-gray-700 bg-gray-50 dark:bg-gray-800/80 shrink-0 flex items-center justify-between gap-2">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                {t('nav.notifications')}
              </h3>
              <div className="flex items-center gap-0.5">
                {unreadCount > 0 && (
                  <button
                    type="button"
                    onClick={() => markAllAlertsRead()}
                    className="p-1.5 rounded-md text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-gray-200 dark:hover:bg-gray-700 transition"
title={t('nav.markAllNotificationsRead')}
                  aria-label={t('nav.markAllNotificationsRead')}
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                    </svg>
                  </button>
                )}
                {alerts.length > 0 && (
                  <button
                    type="button"
                    onClick={() => removeAllAlerts()}
                    className="p-1.5 rounded-md text-gray-500 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-gray-200 dark:hover:bg-gray-700 transition"
                    title={t('nav.deleteAllNotifications') || 'Eliminar totes'}
                    aria-label={t('nav.deleteAllNotifications') || 'Eliminar totes'}
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                )}
              </div>
            </div>
            <div className="overflow-y-auto flex-1 min-h-0">
              {alerts.length === 0 ? (
                <p className="px-3 py-4 text-sm text-gray-500 dark:text-gray-400">
                  {t('nav.noNotifications')}
                </p>
              ) : (
                <ul className="divide-y divide-gray-100 dark:divide-gray-700">
                  {alerts.map((alert) => {
                    const displayTitle =
                      alert.titleKey && typeof t === 'function'
                        ? (() => {
                            const x = t(alert.titleKey!)
                            return x && x.trim() && x !== alert.titleKey ? x : alert.title
                          })()
                        : alert.title
                    const displayMessage =
                      alert.messageKey && typeof t === 'function'
                        ? (() => {
                            const x = t(alert.messageKey!, (alert.params ?? {}) as Record<string, string | number>)
                            return x && x.trim() && x !== alert.messageKey ? x : alert.message
                          })()
                        : alert.message
                    return (
                    <li key={alert.id} className="relative">
                      <button
                        type="button"
                        onClick={() => handleAlertClick(alert.id, alert.action?.url)}
                        className={`w-full text-left pl-3 pr-12 py-2.5 transition ${
                          !alert.read
                            ? 'bg-gray-100 dark:bg-gray-700/70 hover:bg-gray-200 dark:hover:bg-gray-700'
                            : 'hover:bg-gray-50 dark:hover:bg-gray-700/50'
                        }`}
                      >
                        <p
                          className={`text-sm ${
                            alert.read
                              ? 'text-gray-700 dark:text-gray-300 font-normal'
                              : 'text-gray-900 dark:text-white font-semibold'
                          }`}
                        >
                          {displayTitle}
                        </p>
                        <p
                          className={`text-xs mt-0.5 line-clamp-2 ${
                            alert.read ? 'text-gray-500 dark:text-gray-400' : 'text-gray-600 dark:text-gray-300'
                          }`}
                        >
                          {displayMessage}
                        </p>
                      </button>
                      <div className="absolute top-1.5 right-1.5 flex flex-col items-center gap-1.5 min-w-[28px]">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation()
                            removeAlert(alert.id)
                          }}
                          className="p-1 rounded-full text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition shrink-0"
                          title={t('nav.deleteNotification')}
                          aria-label={t('nav.deleteNotification')}
                        >
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                        <div className="flex items-center justify-center w-8 h-8 shrink-0 min-h-[32px]" aria-hidden>
                          <NotificationTypeIcon notificationType={alert.notificationType} ownerReserve={alert.ownerReserve} />
                        </div>
                      </div>
                    </li>
                    )
                  })}
                </ul>
              )}
            </div>
            <div className="border-t border-gray-200 dark:border-gray-700 px-3 py-2 bg-gray-50 dark:bg-gray-800/80 shrink-0">
              <NotificationSettings embedded />
            </div>
          </div>
        )
        return isMobile && typeof document !== 'undefined' && anchorRect
          ? createPortal(panelContent, document.body)
          : panelContent
      })()}
    </div>
  )
}
