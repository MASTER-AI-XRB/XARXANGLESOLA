'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { useI18n } from '@/lib/i18n'

const ONBOARDING_KEY = 'xarxa-onboarding-seen'

const USE_CASE_KEYS = [
  'products',
  'favorites',
  'myProducts',
  'reserve',
  'chat',
  'notifications',
  'settings',
] as const

function getOnboardingSeen(): boolean {
  if (typeof window === 'undefined') return true
  return !!window.localStorage.getItem(ONBOARDING_KEY)
}

const DROPDOWN_GAP = 4

export function AppInfoPopup() {
  const [open, setOpen] = useState(false)
  const [showOnboarding, setShowOnboarding] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const [anchorRect, setAnchorRect] = useState<{ bottom: number; left: number } | null>(null)
  const [buttonRect, setButtonRect] = useState<{ x: number; y: number; r: number } | null>(null)
  const [windowSize, setWindowSize] = useState({ w: 0, h: 0 })
  const panelRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const { t } = useI18n()

  useEffect(() => {
    setShowOnboarding(!getOnboardingSeen())
  }, [])

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 768px)')
    setIsMobile(mq.matches)
    const handler = () => setIsMobile(mq.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])

  useEffect(() => {
    if (!showOnboarding) return
    const updateSize = () => setWindowSize({ w: window.innerWidth, h: window.innerHeight })
    updateSize()
    window.addEventListener('resize', updateSize)
    return () => window.removeEventListener('resize', updateSize)
  }, [showOnboarding])

  const updateButtonRect = useCallback(() => {
    const el = buttonRef.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    const r = Math.max(rect.width, rect.height) / 2 + 12
    setButtonRect({
      x: rect.left + rect.width / 2,
      y: rect.top + rect.height / 2,
      r,
    })
  }, [])

  useEffect(() => {
    if (!showOnboarding) return
    updateButtonRect()
    const ro = new ResizeObserver(updateButtonRect)
    if (buttonRef.current) ro.observe(buttonRef.current)
    window.addEventListener('scroll', updateButtonRect, true)
    window.addEventListener('resize', updateButtonRect)
    return () => {
      ro.disconnect()
      window.removeEventListener('scroll', updateButtonRect, true)
      window.removeEventListener('resize', updateButtonRect)
    }
  }, [showOnboarding, updateButtonRect])

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
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [open])

  const prevOpenRef = useRef(false)
  useEffect(() => {
    if (prevOpenRef.current && !open && showOnboarding) {
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(ONBOARDING_KEY, '1')
        setShowOnboarding(false)
      }
    }
    prevOpenRef.current = open
  }, [open, showOnboarding])

  const handleClosePopup = useCallback(() => {
    setOpen(false)
    if (showOnboarding && typeof window !== 'undefined') {
      window.localStorage.setItem(ONBOARDING_KEY, '1')
      setShowOnboarding(false)
    }
  }, [showOnboarding])

  const onboardingOverlay =
    showOnboarding &&
    typeof document !== 'undefined' &&
    buttonRect &&
    windowSize.w > 0 &&
    windowSize.h > 0 && (
      <>
        {/* Pantalla negra mig opaca amb forat visual (màscara); no bloqueja clics */}
        <div
          className="fixed inset-0 z-[45] pointer-events-none"
          style={{
            background: 'rgba(0,0,0,0.6)',
            maskImage: `radial-gradient(circle at ${buttonRect.x}px ${buttonRect.y}px, transparent ${buttonRect.r}px, black ${buttonRect.r + 1}px)`,
            WebkitMaskImage: `radial-gradient(circle at ${buttonRect.x}px ${buttonRect.y}px, transparent ${buttonRect.r}px, black ${buttonRect.r + 1}px)`,
          }}
          aria-hidden
        />
        {/* Capa que bloqueja clics a tot excepte el forat (SVG amb path evenodd) */}
        <svg
          className="fixed inset-0 z-[45] w-full h-full pointer-events-auto"
          aria-hidden
          style={{ pointerEvents: 'auto' }}
        >
          <path
            fill="transparent"
            fillRule="evenodd"
            d={`M 0 0 H ${windowSize.w} V ${windowSize.h} H 0 Z M ${buttonRect.x} ${buttonRect.y} m ${-buttonRect.r} 0 a ${buttonRect.r} ${buttonRect.r} 0 1 1 ${2 * buttonRect.r} 0 a ${buttonRect.r} ${buttonRect.r} 0 1 1 ${-2 * buttonRect.r} 0`}
          />
        </svg>
        {/* Cercle blau amb efecte pulse; no captura clics */}
        <div
          className="fixed z-[46] rounded-full border-8 border-yellow-500 animate-[pulse-ring_1.5s_ease-in-out_infinite] pointer-events-none"
          style={{
            left: buttonRect.x - (buttonRect.r + 8) / 2,
            top: buttonRect.y - (buttonRect.r + 8) / 2,
            width: buttonRect.r + 8,
            height: buttonRect.r + 8,
          }}
          aria-hidden
        />
      </>
    )

  return (
    <div className="relative flex items-center">
      <button
        ref={buttonRef}
        type="button"
        onClick={() => {
          if (!open && buttonRef.current && isMobile) {
            const rect = buttonRef.current.getBoundingClientRect()
            setAnchorRect({ bottom: rect.bottom, left: rect.left })
          }
          if (open) setAnchorRect(null)
          setOpen((prev) => !prev)
        }}
        className="relative z-[50] p-2 rounded-full text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition"
        title={t('info.title')}
        aria-label={t('info.title')}
        aria-expanded={open}
      >
        <svg
          className="w-5 h-5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      </button>
      {typeof document !== 'undefined' && onboardingOverlay && createPortal(onboardingOverlay, document.body)}
      {open && (() => {
        const panelContent = (
          <div
            ref={panelRef}
            className={
              isMobile && typeof document !== 'undefined' && anchorRect
                ? 'fixed z-[60] w-[min(90vw,22rem)] max-w-[calc(100vw-1rem)] max-h-[min(80vh,28rem)] overflow-hidden rounded-lg shadow-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 flex flex-col'
                : 'absolute right-0 top-full mt-2 w-[min(90vw,22rem)] max-h-[min(80vh,28rem)] overflow-hidden rounded-lg shadow-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 z-50 flex flex-col'
            }
            style={
              isMobile && anchorRect && typeof window !== 'undefined'
                ? {
                    top: anchorRect.bottom + DROPDOWN_GAP,
                    left: anchorRect.left,
                  }
                : undefined
            }
          >
          <div className="px-4 py-3 border-b dark:border-gray-700 bg-blue-50 dark:bg-blue-900/20 shrink-0">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
              {t('info.title')}
            </h3>
            <p className="text-xs text-gray-600 dark:text-gray-300 mt-1">
              {t('info.intro')}
            </p>
          </div>
          <div className="overflow-y-auto flex-1 min-h-0 px-3 py-3 space-y-3">
            {USE_CASE_KEYS.map((key) => (
              <div
                key={key}
                className="text-sm border-l-2 border-blue-200 dark:border-blue-700 pl-3 py-0.5"
              >
                <p className="font-medium text-gray-900 dark:text-white">
                  {t(`info.${key}Title`)}
                </p>
                <p className="text-gray-600 dark:text-gray-400 mt-0.5 text-xs leading-relaxed">
                  {t(`info.${key}Desc`)}
                </p>
              </div>
            ))}
          </div>
          <div className="px-3 py-2 border-t dark:border-gray-700 bg-gray-50 dark:bg-gray-800/80 shrink-0">
<button
            type="button"
            onClick={handleClosePopup}
            className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
          >
            {t('common.close')}
          </button>
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
