'use client'

import { useState, useEffect } from 'react'
import { useI18n } from '@/lib/i18n'

interface TranslateButtonProps {
  text: string
  className?: string
}

export default function TranslateButton({ text, className = '' }: TranslateButtonProps) {
  const { locale, translateText, t } = useI18n()
  const [translatedText, setTranslatedText] = useState<string | null>(null)
  const [translatedLocale, setTranslatedLocale] = useState<string | null>(null)
  const [isTranslating, setIsTranslating] = useState(false)
  const [showOriginal, setShowOriginal] = useState(true)

  // Reiniciar traducció quan canvia l'idioma
  useEffect(() => {
    if (translatedLocale && translatedLocale !== locale) {
      setTranslatedText(null)
      setTranslatedLocale(null)
      setShowOriginal(true)
    }
  }, [locale, translatedLocale])

  const handleTranslate = async () => {
    // Si ja hi ha una traducció per al mateix idioma, alternar entre original i traduït
    if (translatedText && translatedLocale === locale) {
      setShowOriginal(!showOriginal)
      return
    }

    // Si hi ha una traducció però és per a un altre idioma, fer una nova traducció
    setIsTranslating(true)
    try {
      const translated = await translateText(text, locale)
      setTranslatedText(translated)
      setTranslatedLocale(locale)
      setShowOriginal(false)
    } catch (error) {
      console.error('Error translating:', error)
    } finally {
      setIsTranslating(false)
    }
  }

  if (!text || text.trim().length === 0) return null

  return (
    <span className="inline-flex items-center gap-2 flex-wrap">
      <span>{showOriginal ? text : translatedText || text}</span>
      <button
        onClick={handleTranslate}
        disabled={isTranslating}
        className={`inline-flex items-center gap-1 px-2 py-1 text-xs rounded hover:bg-gray-100 transition ${className}`}
        title={showOriginal ? t('common.translate') : t('common.back')}
      >
        {isTranslating ? (
          <>
            <svg className="animate-spin h-3 w-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <span>{t('common.loading')}</span>
          </>
        ) : (
          <>
            <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" />
            </svg>
            <span>{showOriginal ? t('common.translate') : t('common.back')}</span>
          </>
        )}
      </button>
    </span>
  )
}

