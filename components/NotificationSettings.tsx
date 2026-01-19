'use client'

import { useState, useEffect } from 'react'
import { useI18n } from '@/lib/i18n'
import { useNotifications } from '@/lib/notifications'

export default function NotificationSettings() {
  const [permission, setPermission] = useState<NotificationPermission>('default')
  const [showDisableModal, setShowDisableModal] = useState(false)
  const [showEnableModal, setShowEnableModal] = useState(false)
  const [isPWA, setIsPWA] = useState(false)
  const { t } = useI18n()
  const { showSuccess, showError } = useNotifications()

  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window && window.Notification) {
      setPermission(window.Notification.permission)
      
      // Detectar si és una PWA/webapp
      const isStandalone = window.matchMedia('(display-mode: standalone)').matches ||
                          (window.navigator as any).standalone === true ||
                          (typeof document !== 'undefined' && document.referrer.includes('android-app://'))
      setIsPWA(isStandalone)
    }
  }, [])

  // Actualitzar l'estat quan canvia el permís (per si canvia des de fora)
  useEffect(() => {
    const checkPermission = () => {
      if (typeof window !== 'undefined' && 'Notification' in window && window.Notification) {
        const currentPermission = window.Notification.permission
        setPermission(currentPermission)
        // Si el permís ha canviat, tancar els modals
        if (currentPermission === 'denied' && showDisableModal) {
          setShowDisableModal(false)
        }
        if (currentPermission === 'granted' && showEnableModal) {
          setShowEnableModal(false)
        }
      }
    }
    
    // Comprovar cada segon si el permís ha canviat
    const interval = setInterval(checkPermission, 1000)
    return () => clearInterval(interval)
  }, [showDisableModal, showEnableModal])

  const handleToggleNotifications = async () => {
    if (typeof window === 'undefined' || !('Notification' in window) || !window.Notification) {
      return
    }

    const NotificationAPI = window.Notification

    try {
      if (permission === 'granted') {
        // Si està activat, no podem canviar-lo programàticament
        // Mostrar modal amb instruccions
        setShowDisableModal(true)
      } else if (permission === 'denied') {
        // Si està bloquejat, alguns navegadors no permeten cridar requestPermission()
        // Mostrar modal amb instruccions per activar manualment
        setShowEnableModal(true)
      } else {
        // Si està en 'default', intentar demanar permís
        try {
          const newPermission = await NotificationAPI.requestPermission()
          setPermission(newPermission)
          
          if (newPermission === 'granted') {
            showSuccess(
              t('notifications.notificationsEnabled') || 'Notificacions activades',
              t('notifications.notificationsEnabledMessage') || 'Ara rebràs notificacions del navegador.'
            )
          }
          // Si continua en 'denied' o 'default', no mostrar cap missatge
        } catch (error) {
          // Si requestPermission llança un error, mostrar modal amb instruccions
          console.error('Error demanant permís:', error)
          setShowEnableModal(true)
        }
      }
    } catch (error) {
      console.error('Error general gestionant notificacions:', error)
    }
  }

  if (typeof window === 'undefined' || !('Notification' in window) || !window.Notification) {
    return null
  }

  return (
    <>
      <button
        onClick={handleToggleNotifications}
        className={`transition ${
          permission === 'granted'
            ? 'text-green-600 dark:text-green-400 hover:text-green-700 dark:hover:text-green-300'
            : 'text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400'
        }`}
        title={
          permission === 'granted'
            ? t('notifications.disableNotifications') || 'Desactivar notificacions'
            : t('notifications.enableNotifications') || 'Activar notificacions'
        }
      >
        {permission === 'granted' ? (
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            <path d="M10 2a6 6 0 00-6 6v3.586l-.707.707A1 1 0 004 14h12a1 1 0 00.707-1.707L16 11.586V8a6 6 0 00-6-6zM10 18a3 3 0 01-3-3h6a3 3 0 01-3 3z" />
          </svg>
        ) : (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
            />
          </svg>
        )}
      </button>

      {/* Modal per desactivar notificacions quan estan activades */}
      {showDisableModal && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4"
          onClick={() => setShowDisableModal(false)}
        >
          <div
            className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Desactivar notificacions
            </h3>
            <p className="text-gray-700 dark:text-gray-300 mb-4">
              Per desactivar les notificacions, has d'anar a la configuració del teu navegador:
            </p>
            <div className="space-y-3 mb-6 text-sm text-gray-600 dark:text-gray-400">
              {isPWA ? (
                <>
                  <div>
                    <strong className="text-gray-900 dark:text-white">Android (Chrome):</strong>
                    <p className="mt-1">Configuració de l'Android → Aplicacions → Xarxa Anglesola → Notificacions → Desactivar</p>
                  </div>
                  <div>
                    <strong className="text-gray-900 dark:text-white">iOS (Safari):</strong>
                    <p className="mt-1">Configuració de l'iPhone → Safari → Pàgines web → Notificacions → Xarxa Anglesola → Desactivar</p>
                  </div>
                  <div>
                    <strong className="text-gray-900 dark:text-white">Desktop (Chrome/Edge):</strong>
                    <p className="mt-1">Clica amb el botó dret a la icona de l'aplicació a la barra de tasques → Configuració → Notificacions → Desactivar</p>
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <strong className="text-gray-900 dark:text-white">Chrome/Edge:</strong>
                    <p className="mt-1">Clica a l'icona del cadenat (🔒) a l'esquerra de la barra d'adreces → Notificacions → Bloquejar</p>
                  </div>
                  <div>
                    <strong className="text-gray-900 dark:text-white">Firefox:</strong>
                    <p className="mt-1">Clica a l'icona del cadenat (🔒) → Més informació → Permisos → Notificacions → Bloquejar</p>
                  </div>
                  <div>
                    <strong className="text-gray-900 dark:text-white">Safari:</strong>
                    <p className="mt-1">Safari → Configuració → Pàgines web → Notificacions → Bloquejar</p>
                  </div>
                </>
              )}
            </div>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowDisableModal(false)}
                className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition"
              >
                Tancar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal per activar notificacions quan estan bloquejades */}
      {showEnableModal && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4"
          onClick={() => setShowEnableModal(false)}
        >
          <div
            className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Activar notificacions
            </h3>
            <p className="text-gray-700 dark:text-gray-300 mb-4">
              Per activar les notificacions, has d'anar a la configuració del teu navegador:
            </p>
            <div className="space-y-3 mb-6 text-sm text-gray-600 dark:text-gray-400">
              {isPWA ? (
                <>
                  <div>
                    <strong className="text-gray-900 dark:text-white">Android (Chrome):</strong>
                    <p className="mt-1">Configuració de l'Android → Aplicacions → Xarxa Anglesola → Notificacions → Activar</p>
                  </div>
                  <div>
                    <strong className="text-gray-900 dark:text-white">iOS (Safari):</strong>
                    <p className="mt-1">Configuració de l'iPhone → Safari → Pàgines web → Notificacions → Xarxa Anglesola → Permetre</p>
                  </div>
                  <div>
                    <strong className="text-gray-900 dark:text-white">Desktop (Chrome/Edge):</strong>
                    <p className="mt-1">Clica amb el botó dret a la icona de l'aplicació a la barra de tasques → Configuració → Notificacions → Activar</p>
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <strong className="text-gray-900 dark:text-white">Chrome/Edge:</strong>
                    <p className="mt-1">Clica a l'icona del cadenat (🔒) a l'esquerra de la barra d'adreces → Notificacions → Permetre</p>
                  </div>
                  <div>
                    <strong className="text-gray-900 dark:text-white">Firefox:</strong>
                    <p className="mt-1">Clica a l'icona del cadenat (🔒) → Més informació → Permisos → Notificacions → Permetre</p>
                  </div>
                  <div>
                    <strong className="text-gray-900 dark:text-white">Safari:</strong>
                    <p className="mt-1">Safari → Configuració → Pàgines web → Notificacions → Permetre</p>
                  </div>
                </>
              )}
            </div>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowEnableModal(false)}
                className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition"
              >
                Tancar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
