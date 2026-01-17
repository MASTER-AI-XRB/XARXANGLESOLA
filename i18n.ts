import { notFound } from 'next/navigation'
import { getRequestConfig } from 'next-intl/server'

export const locales = ['ca', 'es', 'en'] as const
export type Locale = (typeof locales)[number]

export default getRequestConfig(async ({ requestLocale }) => {
  let locale = await requestLocale
  
  if (!locale || !locales.includes(locale as Locale)) {
    locale = locales[0] // Default to 'ca'
  }

  return {
    locale,
    messages: (await import(`./messages/${locale}.json`)).default
  }
})

