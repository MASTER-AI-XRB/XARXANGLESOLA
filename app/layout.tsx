import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { I18nProvider } from '@/lib/i18n'
import { ThemeProvider } from '@/lib/theme'
import { NotificationProvider } from '@/lib/notifications'
import AuthProvider from '@/components/AuthProvider'
import CookieBanner from '@/components/CookieBanner'

const inter = Inter({ subsets: ['latin'] })

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Xarxa Anglesola - Intercanvi de Productes',
  description: 'Plataforma per a intercanviar productes',
  icons: {
    icon: '/xarxa_logo.jpg',
    apple: '/xarxa_logo.jpg',
  },
  manifest: '/manifest.webmanifest',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ca">
      <body className={inter.className}>
        <ThemeProvider>
          <I18nProvider>
            <NotificationProvider>
              <AuthProvider>
                {children}
                <CookieBanner />
              </AuthProvider>
            </NotificationProvider>
          </I18nProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}

