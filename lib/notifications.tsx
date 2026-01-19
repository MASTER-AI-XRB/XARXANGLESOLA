'use client'

import React, { createContext, useContext, useState, useCallback, ReactNode, useEffect } from 'react'
import { Notification } from '@/components/NotificationToast'
import NotificationToast from '@/components/NotificationToast'

interface NotificationContextType {
  showNotification: (notification: Omit<Notification, 'id'>) => void
  showInfo: (title: string, message: string, options?: Partial<Notification>) => void
  showSuccess: (title: string, message: string, options?: Partial<Notification>) => void
  showWarning: (title: string, message: string, options?: Partial<Notification>) => void
  showError: (title: string, message: string, options?: Partial<Notification>) => void
  requestPermission: () => Promise<boolean>
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined)

export function NotificationProvider({ children }: { children: ReactNode }) {
  const [notifications, setNotifications] = useState<Notification[]>([])

  // Demanar permís per notificacions push al carregar
  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window && window.Notification) {
      // No demanar automàticament, l'usuari ho pot fer manualment
      // Només comprovem que l'API està disponible
    }
  }, [])

  const requestPermission = useCallback(async (): Promise<boolean> => {
    if (typeof window === 'undefined' || !('Notification' in window) || !window.Notification) {
      return false
    }

    const NotificationAPI = window.Notification

    if (NotificationAPI.permission === 'granted') {
      return true
    }

    if (NotificationAPI.permission === 'denied') {
      return false
    }

    const permission = await NotificationAPI.requestPermission()
    return permission === 'granted'
  }, [])

  const showNotification = useCallback((notification: Omit<Notification, 'id'>) => {
    const id = `notification-${Date.now()}-${Math.random()}`
    const newNotification: Notification = {
      ...notification,
      id,
    }
    setNotifications((prev) => [...prev, newNotification])

    // Notificació push del navegador si està disponible
    if (typeof window !== 'undefined' && 'Notification' in window && window.Notification) {
      const NotificationAPI = window.Notification
      if (NotificationAPI.permission === 'granted') {
        try {
          const browserNotification = new NotificationAPI(notification.title, {
            body: notification.message,
            icon: '/logo.png',
            badge: '/logo.png',
            tag: id, // Per evitar notificacions duplicades
          })

          // Tancar la notificació del navegador quan es clica
          browserNotification.onclick = () => {
            window.focus()
            browserNotification.close()
            if (notification.action) {
              notification.action.onClick()
            }
          }
        } catch (error) {
          console.error('Error creant notificació del navegador:', error)
        }
      }
    }
  }, [])

  const removeNotification = useCallback((id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id))
  }, [])

  const showInfo = useCallback(
    (title: string, message: string, options?: Partial<Notification>) => {
      showNotification({ type: 'info', title, message, ...options })
    },
    [showNotification]
  )

  const showSuccess = useCallback(
    (title: string, message: string, options?: Partial<Notification>) => {
      showNotification({ type: 'success', title, message, ...options })
    },
    [showNotification]
  )

  const showWarning = useCallback(
    (title: string, message: string, options?: Partial<Notification>) => {
      showNotification({ type: 'warning', title, message, ...options })
    },
    [showNotification]
  )

  const showError = useCallback(
    (title: string, message: string, options?: Partial<Notification>) => {
      showNotification({ type: 'error', title, message, ...options })
    },
    [showNotification]
  )

  return (
    <NotificationContext.Provider
      value={{
        showNotification,
        showInfo,
        showSuccess,
        showWarning,
        showError,
        requestPermission,
      }}
    >
      {children}
      <div className="fixed top-4 right-4 z-50 space-y-2 max-w-sm w-full">
        {notifications.map((notification, index) => (
          <div key={notification.id} style={{ marginTop: index > 0 ? '0.5rem' : '0' }}>
            <NotificationToast
              notification={notification}
              onClose={() => removeNotification(notification.id)}
            />
          </div>
        ))}
      </div>
    </NotificationContext.Provider>
  )
}

export function useNotifications() {
  const context = useContext(NotificationContext)
  if (!context) {
    throw new Error('useNotifications must be used within NotificationProvider')
  }
  return context
}
