'use client'

import { useState, useRef, useEffect, useLayoutEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { useI18n } from '@/lib/i18n'
import { useOnboarding } from '@/lib/onboarding-context'

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

/** Passos del tutorial: 0 = icona (i), 1 = titular, 2..8 = productes, preferits, ... configuració */
const ONBOARDING_STEPS = 1 + 1 + USE_CASE_KEYS.length // icon + header + 7 seccions

function getOnboardingSeen(): boolean {
  if (typeof window === 'undefined') return true
  return !!window.localStorage.getItem(ONBOARDING_KEY)
}

const DROPDOWN_GAP = 4
const MOBILE_LEFT_MARGIN = 8 // 0.5rem, marge mínim per no tallar per l'esquerra
const INFO_PANEL_MAX_WIDTH_PX = 352 // 22rem

type HoleCircle = { x: number; y: number; r: number }
type HoleBox = { left: number; top: number; width: number; height: number }

export function AppInfoPopup() {
  const [open, setOpen] = useState(false)
  const [showOnboarding, setShowOnboarding] = useState(false)
  const [onboardingStep, setOnboardingStep] = useState(0)
  const [isMobile, setIsMobile] = useState(false)
  const [anchorRect, setAnchorRect] = useState<{ bottom: number; right: number } | null>(null)
  const [buttonRect, setButtonRect] = useState<HoleCircle | null>(null)
  const [stepRect, setStepRect] = useState<HoleBox | null>(null)
  const [windowSize, setWindowSize] = useState({ w: 0, h: 0 })
  const panelRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const headerRef = useRef<HTMLDivElement>(null)
  const stepRefs = useRef<(HTMLDivElement | null)[]>([])
  const { t } = useI18n()
  const { setOnboardingActive } = useOnboarding()

  useEffect(() => {
    setShowOnboarding(!getOnboardingSeen())
  }, [])

  useEffect(() => {
    setOnboardingActive(showOnboarding)
  }, [showOnboarding, setOnboardingActive])

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
    // Només mostrar onboarding quan aquesta instància és visible (evita duplicat desktop/mòbil)
    if (rect.width <= 0 || rect.height <= 0) {
      setButtonRect(null)
      return
    }
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

  // Re-mesurar el botó just abans de pintar l'overlay (pas 0) per centrar forat i cercle
  useLayoutEffect(() => {
    if (showOnboarding && onboardingStep === 0) updateButtonRect()
  }, [showOnboarding, onboardingStep, updateButtonRect])

  useEffect(() => {
    if (!open) return
    const handleClickOutside = (e: MouseEvent) => {
      if (showOnboarding && onboardingStep > 0) return
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
  }, [open, showOnboarding, onboardingStep])

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
    setOnboardingStep(0)
    if (showOnboarding && typeof window !== 'undefined') {
      window.localStorage.setItem(ONBOARDING_KEY, '1')
      setShowOnboarding(false)
    }
  }, [showOnboarding])

  const advanceOnboarding = useCallback(() => {
    if (onboardingStep < ONBOARDING_STEPS - 1) {
      setOnboardingStep((s) => s + 1)
    } else {
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(ONBOARDING_KEY, '1')
      }
      setShowOnboarding(false)
      setOpen(false)
      setOnboardingStep(0)
    }
  }, [onboardingStep])

  useLayoutEffect(() => {
    if (!showOnboarding || !open || onboardingStep < 1) {
      setStepRect(null)
      return
    }
    const el =
      onboardingStep === 1
        ? headerRef.current
        : stepRefs.current[onboardingStep - 2] ?? null
    if (!el) {
      setStepRect(null)
      return
    }
    const rect = el.getBoundingClientRect()
    if (rect.width <= 0 || rect.height <= 0) {
      setStepRect(null)
      return
    }
    const pad = 4
    setStepRect({
      left: Math.max(0, rect.left - pad),
      top: Math.max(0, rect.top - pad),
      width: rect.width + 2 * pad,
      height: rect.height + 2 * pad,
    })
  }, [showOnboarding, open, onboardingStep])

  const showOverlay =
    showOnboarding &&
    typeof document !== 'undefined' &&
    windowSize.w > 0 &&
    windowSize.h > 0 &&
    (onboardingStep === 0 ? !!buttonRect : !!stepRect && open)

  const overlayZ = 70
  const onboardingOverlay = showOverlay && (
    <>
      {onboardingStep === 0 && buttonRect ? (
        <>
          {/* Pas 0: forat circular a la icona (i); z-[70] per sobre del popup */}
          <div
            className="fixed inset-0 pointer-events-none"
            style={{
              zIndex: overlayZ,
              background: 'rgba(0,0,0,0.6)',
              maskImage: `radial-gradient(circle at ${buttonRect.x}px ${buttonRect.y}px, transparent ${buttonRect.r}px, black ${buttonRect.r + 1}px)`,
              WebkitMaskImage: `radial-gradient(circle at ${buttonRect.x}px ${buttonRect.y}px, transparent ${buttonRect.r}px, black ${buttonRect.r + 1}px)`,
            }}
            aria-hidden
          />
          <div className="fixed inset-0 w-full h-full" style={{ zIndex: overlayZ, pointerEvents: 'none' }} aria-hidden>
            <div className="absolute bg-transparent" style={{ left: 0, top: 0, width: windowSize.w, height: Math.max(0, buttonRect.y - buttonRect.r), pointerEvents: 'auto' }} />
            <div className="absolute bg-transparent" style={{ left: 0, top: buttonRect.y - buttonRect.r, width: Math.max(0, buttonRect.x - buttonRect.r), height: 2 * buttonRect.r, pointerEvents: 'auto' }} />
            <div className="absolute bg-transparent" style={{ left: buttonRect.x + buttonRect.r, top: buttonRect.y - buttonRect.r, width: Math.max(0, windowSize.w - (buttonRect.x + buttonRect.r)), height: 2 * buttonRect.r, pointerEvents: 'auto' }} />
            <div className="absolute bg-transparent" style={{ left: 0, top: buttonRect.y + buttonRect.r, width: windowSize.w, height: Math.max(0, windowSize.h - (buttonRect.y + buttonRect.r)), pointerEvents: 'auto' }} />
          </div>
          {/* Posició explícita (no transform) perquè l'animació pulse-ring no sobreescrigui el centrat; +2px compensa la vora */}
          <div
            className="fixed rounded-full border-8 border-yellow-500 animate-[pulse-ring_1.5s_ease-in-out_infinite] pointer-events-none"
            style={{
              zIndex: overlayZ + 1,
              left: buttonRect.x - (buttonRect.r + 8) / 2,
              top: buttonRect.y - (buttonRect.r + 8) / 2,
              width: buttonRect.r + 8,
              height: buttonRect.r + 8,
            }}
            aria-hidden
          />
        </>
      ) : stepRect ? (
        <>
          {/* Pas ≥1: forat rectangular amb mida del contingut; 4 bandes fosques per sobre del popup (z-[70]) */}
          <div className="fixed inset-0 w-full h-full" style={{ zIndex: overlayZ, pointerEvents: 'none' }} aria-hidden>
            <div
              className="absolute bg-black/60"
              style={{ left: 0, top: 0, width: windowSize.w, height: Math.max(0, stepRect.top), pointerEvents: 'auto' }}
              onClick={advanceOnboarding}
              role="button"
              aria-label={t('common.next')}
            />
            <div
              className="absolute bg-black/60"
              style={{ left: 0, top: stepRect.top, width: Math.max(0, stepRect.left), height: stepRect.height, pointerEvents: 'auto' }}
              onClick={advanceOnboarding}
              role="button"
              aria-label={t('common.next')}
            />
            <div
              className="absolute bg-black/60"
              style={{ left: stepRect.left + stepRect.width, top: stepRect.top, width: Math.max(0, windowSize.w - (stepRect.left + stepRect.width)), height: stepRect.height, pointerEvents: 'auto' }}
              onClick={advanceOnboarding}
              role="button"
              aria-label={t('common.next')}
            />
            <div
              className="absolute bg-black/60"
              style={{ left: 0, top: stepRect.top + stepRect.height, width: windowSize.w, height: Math.max(0, windowSize.h - (stepRect.top + stepRect.height)), pointerEvents: 'auto' }}
              onClick={advanceOnboarding}
              role="button"
              aria-label={t('common.next')}
            />
          </div>
          {/* Vora de ressalt al voltant del forat */}
          <div
            className="fixed rounded-md border-2 border-yellow-500 pointer-events-none"
            style={{
              zIndex: overlayZ + 1,
              left: stepRect.left,
              top: stepRect.top,
              width: stepRect.width,
              height: stepRect.height,
            }}
            aria-hidden
          />
        </>
      ) : null}
    </>
  )

  return (
    <div className="relative flex items-center">
      <button
        ref={buttonRef}
        type="button"
        onClick={() => {
          if (showOnboarding && onboardingStep === 0 && !open) {
            if (buttonRef.current) {
              const rect = buttonRef.current.getBoundingClientRect()
              setAnchorRect({ bottom: rect.bottom, right: rect.right })
            }
            setOpen(true)
            setOnboardingStep(1)
            return
          }
          if (!open && buttonRef.current) {
            const rect = buttonRef.current.getBoundingClientRect()
            if (isMobile) setAnchorRect({ bottom: rect.bottom, right: rect.right })
            else if (showOnboarding) setAnchorRect({ bottom: rect.bottom, right: rect.right })
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
      {open && (() => {
        const portalPanel = (showOnboarding && typeof document !== 'undefined') || (isMobile && typeof document !== 'undefined' && anchorRect)
        const isFixed = portalPanel
        const panelZ = showOnboarding ? 'z-[65]' : 'z-[60]'
        const maxHeightClass = showOnboarding ? 'max-h-[90vh]' : 'max-h-[min(80vh,28rem)]'
        const overflowClass = showOnboarding ? 'overflow-y-auto overflow-x-hidden' : 'overflow-hidden'
        const panelContent = (
          <div
            ref={panelRef}
            className={
              isFixed
                ? `fixed ${panelZ} w-[min(90vw,22rem)] max-w-[calc(100vw-1rem)] ${maxHeightClass} ${overflowClass} rounded-lg shadow-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 flex flex-col`
                : `absolute right-0 top-full mt-2 w-[min(90vw,22rem)] ${maxHeightClass} ${overflowClass} rounded-lg shadow-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 z-50 flex flex-col`
            }
            style={
              isFixed && anchorRect && typeof window !== 'undefined'
                ? (() => {
                    const w = Math.min(window.innerWidth * 0.9, INFO_PANEL_MAX_WIDTH_PX)
                    const rightAligned = window.innerWidth - anchorRect.right
                    const rightSoLeftMargin = window.innerWidth - MOBILE_LEFT_MARGIN - w
                    return {
                      top: anchorRect.bottom + DROPDOWN_GAP,
                      right: Math.min(rightAligned, rightSoLeftMargin),
                    }
                  })()
                : isFixed && !anchorRect && typeof window !== 'undefined'
                  ? { top: '1rem', right: '1rem', left: '1rem', margin: '0 auto', maxWidth: '22rem' }
                  : undefined
            }
          >
          <div
            ref={headerRef}
            className="px-4 py-3 border-b dark:border-gray-700 bg-blue-50 dark:bg-blue-900/20 shrink-0 cursor-default"
            onClick={showOnboarding ? advanceOnboarding : undefined}
            role={showOnboarding ? 'button' : undefined}
            aria-label={showOnboarding ? t('common.next') : undefined}
          >
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
              {t('info.title')}
            </h3>
            <p className="text-xs text-gray-600 dark:text-gray-300 mt-1">
              {t('info.intro')}
            </p>
          </div>
          <div
            className={`px-3 py-3 space-y-3 ${showOnboarding ? 'flex-none' : 'flex-1 min-h-0 overflow-y-auto'}`}
          >
            {USE_CASE_KEYS.map((key, index) => (
              <div
                key={key}
                ref={(el) => {
                  if (stepRefs.current) stepRefs.current[index] = el
                }}
                className="text-sm border-l-2 border-blue-200 dark:border-blue-700 pl-3 py-0.5 cursor-default"
                onClick={showOnboarding ? advanceOnboarding : undefined}
                role={showOnboarding ? 'button' : undefined}
                aria-label={showOnboarding ? t('common.next') : undefined}
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
        return portalPanel && typeof document !== 'undefined'
          ? createPortal(panelContent, document.body)
          : panelContent
      })()}
      {/* Overlay d'onboarding després del panell per quedar per sobre (z-[70]) */}
      {typeof document !== 'undefined' && onboardingOverlay && createPortal(onboardingOverlay, document.body)}
    </div>
  )
}
