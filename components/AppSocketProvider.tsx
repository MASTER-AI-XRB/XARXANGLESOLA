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
  const routerRef = useRef(router)
  const showInfoRef = useRef(showInfo)
  const addAlertRef = useRef(addAlert)
  routerRef.current = router
  showInfoRef.current = showInfo
  addAlertRef.current = addAlert

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

    s.on('app-notification', (data: { type?: string; title?: string; message?: string; action?: { label?: string; url?: string } }) => {
      const r = routerRef.current
      const sh = showInfoRef.current
      const addA = addAlertRef.current
      sh(data.title ?? '', data.message ?? '', {
        type: (data.type as 'info' | 'success' | 'warning' | 'error') || 'info',
        action: data.action?.url
          ? {
              label: data.action.label ?? '',
              onClick: () => r.push(data.action!.url!),
            }
          : undefined,
      })
      addA({
        title: data.title ?? '',
        message: data.message ?? '',
        action: data.action?.url ? { url: data.action.url, label: data.action.label } : undefined,
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
