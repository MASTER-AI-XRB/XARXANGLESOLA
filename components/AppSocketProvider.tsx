'use client'

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useRef,
  type ReactNode,
} from 'react'
import { useRouter } from 'next/navigation'
import { io, type Socket } from 'socket.io-client'
import { getSocketUrl } from '@/lib/socket'
import { getStoredNickname, getStoredSocketToken } from '@/lib/client-session'
import { useNotifications } from '@/lib/notifications'
import { useI18n, formatTranslation, getLocaleNow } from '@/lib/i18n'
import { logInfo, logWarn } from '@/lib/client-logger'

type AppSocketContextValue = {
  socket: Socket | null
  connected: boolean
}

const AppSocketContext = createContext<AppSocketContextValue>({
  socket: null,
  connected: false,
})

export function useAppSocket() {
  return useContext(AppSocketContext)
}

export function AppSocketProvider({ children, ready }: { children: ReactNode; ready?: boolean }) {
  const [socket, setSocket] = useState<Socket | null>(null)
  const [connected, setConnected] = useState(false)
  const router = useRouter()
  const { showInfo, addAlert } = useNotifications()
  const { locale } = useI18n()
  const routerRef = useRef(router)
  const showInfoRef = useRef(showInfo)
  const addAlertRef = useRef(addAlert)
  const localeRef = useRef(locale)
  routerRef.current = router
  showInfoRef.current = showInfo
  addAlertRef.current = addAlert
  localeRef.current = locale

  useEffect(() => {
    if (ready === false) {
      setSocket((prev) => {
        if (prev) {
          prev.close()
          return null
        }
        return prev
      })
      setConnected(false)
      return
    }
    const nickname = getStoredNickname()
    const socketToken = getStoredSocketToken()
    const socketUrl = getSocketUrl()
    if (!nickname || !socketToken || !socketUrl) return

    const s = io(socketUrl, {
      auth: { token: socketToken },
      transports: ['polling', 'websocket'],
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
    })

    s.on('connect', () => {
      logInfo('AppSocket connectat')
      setConnected(true)
    })
    s.on('disconnect', () => setConnected(false))
    s.on('connect_error', (err) => {
      logWarn('AppSocket connect_error', err?.message)
      setConnected(false)
    })

    s.on('app-notification', (data: {
      type?: string
      title?: string
      message?: string
      titleKey?: string
      messageKey?: string
      params?: Record<string, string>
      actorNickname?: string
      productName?: string
      notificationType?: string
      ownerReserve?: boolean
      action?: { label?: string; labelKey?: string; url?: string }
    }) => {
      const r = routerRef.current
      const sh = showInfoRef.current
      const addA = addAlertRef.current
      const locale = localeRef.current ?? getLocaleNow()
      const rawParams = (data.params ?? {}) as Record<string, string | number>
      const params: Record<string, string | number> = {
        ...rawParams,
        nickname: rawParams.nickname ?? rawParams.user ?? data.actorNickname ?? '',
        productName: rawParams.productName ?? rawParams.producte ?? data.productName ?? '',
      }
      // Preferir traducció (idioma de l’app) quan hi ha clau; literal com a fallback
      let title = ''
      let message = ''
      let actionLabel = ''
      if (data.titleKey) {
        const translated = formatTranslation(locale, data.titleKey)
        title = (translated && translated.trim() && translated !== data.titleKey) ? translated : (data.title ?? '')
      } else {
        title = (typeof data.title === 'string' && data.title.trim()) ? data.title : ''
      }
      if (data.messageKey) {
        const translated = formatTranslation(locale, data.messageKey, params)
        message = (translated && translated.trim() && translated !== data.messageKey) ? translated : (data.message ?? '')
      } else {
        message = (typeof data.message === 'string' && data.message.trim()) ? data.message : ''
      }
      if (data.action?.labelKey) {
        const translated = formatTranslation(locale, data.action.labelKey)
        actionLabel = (translated && translated.trim() && translated !== data.action.labelKey) ? translated : (data.action?.label ?? '')
      } else {
        actionLabel = (typeof data.action?.label === 'string' && data.action.label.trim()) ? data.action.label : ''
      }
      if (!title) title = formatTranslation(locale, 'common.appName')
      if (!message) message = ' '
      sh(title, message, {
        type: (data.type as 'info' | 'success' | 'warning' | 'error') || 'info',
        notificationType: data.notificationType,
        ownerReserve: data.ownerReserve === true,
        action: data.action?.url
          ? {
              label: actionLabel,
              onClick: () => r.push(data.action!.url!),
            }
          : undefined,
      })
      addA({
        title,
        message,
        notificationType: data.notificationType,
        ownerReserve: data.ownerReserve === true,
        titleKey: data.titleKey,
        messageKey: data.messageKey,
        params: Object.keys(params).length ? params : undefined,
        actionLabelKey: data.action?.labelKey,
        action: data.action?.url ? { url: data.action.url, label: actionLabel } : undefined,
      })
    })

    s.on('product-state', (data: { productId: string; reserved?: boolean; reservedBy?: { nickname: string } | null; prestec?: boolean }) => {
      if (typeof window !== 'undefined' && data?.productId) {
        logInfo('product-state rebut:', { productId: data.productId, reserved: data.reserved, reservedBy: data.reservedBy })
        window.dispatchEvent(new CustomEvent('product-state', { detail: data }))
      }
    })

    setSocket(s)
    return () => {
      s.close()
      setSocket(null)
      setConnected(false)
    }
  }, [ready])

  return (
    <AppSocketContext.Provider value={{ socket, connected }}>
      {children}
    </AppSocketContext.Provider>
  )
}
