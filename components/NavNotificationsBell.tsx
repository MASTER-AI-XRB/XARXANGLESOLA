'use client'

import { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useRouter } from 'next/navigation'
import { useNotifications } from '@/lib/notifications'
import { useI18n } from '@/lib/i18n'
import NotificationSettings from '@/components/NotificationSettings'

export function NavNotificationsBell() {
  const [open, setOpen] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const [anchorRect, setAnchorRect] = useState<{ bottom: number; right: number } | null>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const { alerts, markAlertRead } = useNotifications()
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
                ? 'fixed z-[60] mt-2 w-80 max-w-[calc(100vw-1rem)] max-h-[min(70vh,24rem)] overflow-hidden rounded-lg shadow-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 flex flex-col'
                : 'absolute right-0 top-full mt-2 w-80 max-h-[min(70vh,24rem)] overflow-hidden rounded-lg shadow-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 z-50 flex flex-col'
            }
            style={
              isMobile && anchorRect && typeof window !== 'undefined'
                ? {
                    top: anchorRect.bottom + 8,
                    right: window.innerWidth - anchorRect.right,
                  }
                : undefined
            }
          >
            <div className="px-3 py-2 border-b dark:border-gray-700 bg-gray-50 dark:bg-gray-800/80 shrink-0">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                {t('nav.notifications')}
              </h3>
            </div>
            <div className="overflow-y-auto flex-1 min-h-0">
              {alerts.length === 0 ? (
                <p className="px-3 py-4 text-sm text-gray-500 dark:text-gray-400">
                  {t('nav.noNotifications')}
                </p>
              ) : (
                <ul className="divide-y divide-gray-100 dark:divide-gray-700">
                  {alerts.map((alert) => (
                    <li key={alert.id}>
                      <button
                        type="button"
                        onClick={() => handleAlertClick(alert.id, alert.action?.url)}
                        className="w-full text-left px-3 py-2.5 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition"
                      >
                        <p
                          className={`text-sm ${
                            alert.read
                              ? 'text-gray-700 dark:text-gray-300 font-normal'
                              : 'text-gray-900 dark:text-white font-semibold'
                          }`}
                        >
                          {alert.title}
                        </p>
                        <p
                          className={`text-xs mt-0.5 line-clamp-2 ${
                            alert.read ? 'text-gray-500 dark:text-gray-400' : 'text-gray-600 dark:text-gray-300'
                          }`}
                        >
                          {alert.message}
                        </p>
                      </button>
                    </li>
                  ))}
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
