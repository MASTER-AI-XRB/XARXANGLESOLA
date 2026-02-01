'use client'

import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useI18n } from '@/lib/i18n'
import { useTheme } from '@/lib/theme'
import Image from 'next/image'

export default function LanguageSelector({ forceMobile = false }: { forceMobile?: boolean }) {
  const { locale, setLocale } = useI18n()
  const { theme } = useTheme()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 768px)')
    setIsMobile(mq.matches)
    const handler = () => setIsMobile(mq.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])

  const languages = [
    { code: 'ca' as const, name: 'Català'},
    { code: 'es' as const, name: 'Español'},
    { code: 'en' as const, name: 'English'},
  ]

  const currentLanguage = languages.find(lang => lang.code === locale) || languages[0]
  const iconSrc = theme === 'dark' ? '/lang_icon_dark.png' : '/lang_icon.png'

  return (
    <>
      {/* Versió mòbil: botó amb icona */}
      <div className={forceMobile ? "relative" : "sm:hidden relative"}>
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="flex items-center gap-1 p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 transition"
          title={currentLanguage.name}
        >
          <Image
            src={iconSrc}
            alt="Idioma"
            width={20}
            height={20}
            className="object-contain"
          />
        </button>
        {mobileOpen && (
          <>
            {isMobile && typeof document !== 'undefined' ? (
              createPortal(
                <>
                  <div
                    className="fixed inset-0 z-[55]"
                    onClick={() => setMobileOpen(false)}
                    aria-hidden
                  />
                  <div className="fixed right-0 top-16 z-[60] mt-0 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-md shadow-lg dark:shadow-gray-900 min-w-[120px]">
                    {languages.map((lang) => (
                      <button
                        key={lang.code}
                        onClick={() => {
                          setLocale(lang.code)
                          setMobileOpen(false)
                        }}
                        className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 transition ${
                          locale === lang.code ? 'bg-blue-50 dark:bg-blue-900 text-blue-700 dark:text-blue-300 font-medium' : 'text-gray-700 dark:text-gray-300'
                        } ${lang.code === languages[0].code ? 'rounded-t-md' : ''} ${
                          lang.code === languages[languages.length - 1].code ? 'rounded-b-md' : ''
                        }`}
                      >
                        {lang.name}
                      </button>
                    ))}
                  </div>
                </>,
                document.body
              )
            ) : (
              <>
                <div
                  className="fixed inset-0 z-[55]"
                  onClick={() => setMobileOpen(false)}
                  aria-hidden
                />
                <div className="absolute right-0 mt-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-md shadow-lg dark:shadow-gray-900 z-20 min-w-[120px]">
                  {languages.map((lang) => (
                    <button
                      key={lang.code}
                      onClick={() => {
                        setLocale(lang.code)
                        setMobileOpen(false)
                      }}
                      className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 transition ${
                        locale === lang.code ? 'bg-blue-50 dark:bg-blue-900 text-blue-700 dark:text-blue-300 font-medium' : 'text-gray-700 dark:text-gray-300'
                      } ${lang.code === languages[0].code ? 'rounded-t-md' : ''} ${
                        lang.code === languages[languages.length - 1].code ? 'rounded-b-md' : ''
                      }`}
                    >
                      {lang.name}
                    </button>
                  ))}
                </div>
              </>
            )}
          </>
        )}
      </div>

      {/* Versió desktop: desplegable complet */}
      {!forceMobile && (
      <div className="hidden sm:flex items-center gap-2">
        <Image
          src={iconSrc}
          alt="Idioma"
          width={20}
          height={20}
          className="object-contain"
        />
        <div className="relative">
          <select
            value={locale}
            onChange={(e) => setLocale(e.target.value as 'ca' | 'es' | 'en')}
            className="appearance-none bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 pr-8 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            {languages.map((lang) => (
              <option key={lang.code} value={lang.code}>
                {lang.name}
              </option>
            ))}
          </select>
          <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700 dark:text-gray-300">
            <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
              <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" />
            </svg>
          </div>
        </div>
      </div>
      )}
    </>
  )
}

