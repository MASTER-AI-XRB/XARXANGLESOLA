'use client'

import { useEffect, useRef } from 'react'
import Link from 'next/link'

const NAV_ITEMS = [
  { href: '/app', titleKey: 'nav.products', icon: 'products' },
  { href: '/app/favorites', titleKey: 'nav.favorites', icon: 'favorites' },
  { href: '/app/my-products', titleKey: 'nav.myProducts', icon: 'myProducts' },
  { href: '/app/chat', titleKey: 'nav.chat', icon: 'chat' },
  { href: '/app/configuracio', titleKey: 'nav.settings', icon: 'settings' },
] as const

const ICON_SVG: Record<(typeof NAV_ITEMS)[number]['icon'], JSX.Element> = {
  products: (
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
  ),
  favorites: (
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
  ),
  myProducts: (
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
  ),
  chat: (
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
  ),
  settings: (
    <>
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </>
  ),
}

const ITEM_WIDTH = 48

function getCurrentIndex(pathname: string): number {
  const idx = NAV_ITEMS.findIndex((item) => {
    if (item.href === '/app') return pathname === '/app'
    return pathname.startsWith(item.href)
  })
  return idx >= 0 ? idx : 0
}

export function MobileNavCarousel({
  pathname,
  t,
}: {
  pathname: string
  t: (key: string) => string
}) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const currentIndex = getCurrentIndex(pathname)

  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    const targetScroll = currentIndex * ITEM_WIDTH
    el.scrollTo({ left: targetScroll, behavior: 'smooth' })
  }, [currentIndex])

  const scrollPrev = () => {
    const el = scrollRef.current
    if (!el) return
    el.scrollBy({ left: -ITEM_WIDTH, behavior: 'smooth' })
  }

  const scrollNext = () => {
    const el = scrollRef.current
    if (!el) return
    el.scrollBy({ left: ITEM_WIDTH, behavior: 'smooth' })
  }

  const canScrollPrev = currentIndex > 0
  const canScrollNext = currentIndex < NAV_ITEMS.length - 1

  return (
    <nav
      className="flex md:hidden flex-1 min-w-0 items-center gap-0 px-0 max-md:landscape:hidden min-w-[107px] w-[180px]"
      aria-label="Navegació principal"
    >
      <button
        type="button"
        onClick={scrollPrev}
        disabled={!canScrollPrev}
        title={canScrollPrev ? t('common.previous') : undefined}
        className="relative z-20 shrink-0 rounded-lg p-1.5 sm:p-2 min-w-[44px] min-h-[44px] flex items-center justify-center touch-manipulation text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-gray-500 disabled:dark:hover:text-gray-400 transition"
        aria-label="Anterior"
      >
        <svg className="h-4 w-4 sm:h-5 sm:w-5 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
      </button>
      <div
        ref={scrollRef}
        className="relative z-0 flex flex-1 min-w-0 overflow-x-auto overflow-y-hidden scroll-smooth snap-x snap-mandatory [-webkit-overflow-scrolling:touch] scrollbar-hide touch-pan-x"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        <div className="flex">
          {NAV_ITEMS.map((item) => {
            const isActive =
              (item.href === '/app' && pathname === '/app') || pathname.startsWith(item.href + '/') || pathname === item.href
            return (
              <Link
                key={item.href}
                href={item.href}
                className="flex shrink-0 snap-center items-center justify-center rounded-lg p-2 sm:p-3 transition w-11 h-11 sm:w-12 sm:h-12 text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-gray-100 dark:hover:bg-gray-700"
                aria-current={isActive ? 'page' : undefined}
                title={t(item.titleKey)}
                aria-label={t(item.titleKey)}
                style={{ minWidth: ITEM_WIDTH }}
              >
                <svg
                  className={`h-6 w-6 ${isActive ? 'text-blue-600 dark:text-blue-400' : ''}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  {ICON_SVG[item.icon]}
                </svg>
              </Link>
            )
          })}
        </div>
      </div>
      <button
        type="button"
        onClick={scrollNext}
        disabled={!canScrollNext}
        title={canScrollNext ? t('common.next') : undefined}
        className="relative z-20 shrink-0 rounded-lg p-1.5 sm:p-2 min-w-[44px] min-h-[44px] flex items-center justify-center touch-manipulation text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-gray-500 disabled:dark:hover:text-gray-400 transition"
        aria-label="Següent"
      >
        <svg className="h-4 w-4 sm:h-5 sm:w-5 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </button>
    </nav>
  )
}
