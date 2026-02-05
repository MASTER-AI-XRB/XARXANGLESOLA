'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { io, Socket } from 'socket.io-client'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter, useSearchParams } from 'next/navigation'
import { useI18n } from '@/lib/i18n'
import { useNotifications } from '@/lib/notifications'
import TranslateButton from '@/components/TranslateButton'
import { getSocketUrl } from '@/lib/socket'
import { getStoredNickname, getStoredSocketToken } from '@/lib/client-session'
import { logError, logInfo, logWarn } from '@/lib/client-logger'

interface Message {
  id: string
  content: string
  userNickname: string
  createdAt: string
  productId?: string | null
}

interface ProductSummary {
  id: string
  name: string
  images: string[]
  reserved?: boolean
  reservedBy?: { nickname: string } | null
}

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [socket, setSocket] = useState<Socket | null>(null)
  const [connected, setConnected] = useState(false)
  const [privateChats, setPrivateChats] = useState<{ [key: string]: Message[] }>({})
  const [activePrivateChat, setActivePrivateChat] = useState<string | null>(null)
  const [activePrivateTab, setActivePrivateTab] = useState<string | null>(null)
  const [openPrivateChats, setOpenPrivateChats] = useState<string[]>([])
  const [unreadPrivateChats, setUnreadPrivateChats] = useState<Record<string, number>>({})
  const [privateChatProducts, setPrivateChatProducts] = useState<Record<string, ProductSummary[]>>(
    {}
  )
  const [privateChatProductsFetched, setPrivateChatProductsFetched] = useState<
    Record<string, boolean>
  >({})
  const [loadingPrivateProducts, setLoadingPrivateProducts] = useState<Record<string, boolean>>({})
  const [onlineUsers, setOnlineUsers] = useState<string[]>([])
  const [isOnlineUsersDrawerOpen, setIsOnlineUsersDrawerOpen] = useState(false)
  const [hasRestoredChats, setHasRestoredChats] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const activePrivateProductIdRef = useRef<string | null>(null)
  const productIdFromUrlRef = useRef<string | null>(null)
  const confettiFiredForProductRef = useRef<string | null>(null)
  const refetchForProductUrlDoneRef = useRef<string | null>(null)
  const confettiModuleRef = useRef<((opts?: object) => void) | null>(null)
  const confettiCanvasRef = useRef<HTMLCanvasElement | null>(null)
  const privateChatProductsRef = useRef(privateChatProducts)
  const privateChatProductsFetchedRef = useRef(privateChatProductsFetched)
  const loadingPrivateProductsRef = useRef(loadingPrivateProducts)
  
  const nickname = getStoredNickname()
  const searchParams = useSearchParams()
  const { t, locale } = useI18n()
  const { showInfo } = useNotifications()
  const router = useRouter()

  const resolveActiveProductId = (tab: string | null) => {
    if (tab === null) return null
    return tab === 'general' ? null : tab
  }

  useEffect(() => {
    activePrivateProductIdRef.current = resolveActiveProductId(activePrivateTab)
  }, [activePrivateTab])

  useEffect(() => {
    privateChatProductsRef.current = privateChatProducts
  }, [privateChatProducts])

  useEffect(() => {
    privateChatProductsFetchedRef.current = privateChatProductsFetched
  }, [privateChatProductsFetched])

  useEffect(() => {
    loadingPrivateProductsRef.current = loadingPrivateProducts
  }, [loadingPrivateProducts])

  const buildPrivateChatKey = (chatNickname: string, productId: string | null) =>
    `${chatNickname}::${productId || 'general'}`

  const hasUnreadForUser = (chatNickname: string) =>
    Object.entries(unreadPrivateChats).some(
      ([key, count]) => key.startsWith(`${chatNickname}::`) && count > 0
    )

  const getUnreadForProduct = (chatNickname: string, productId: string | null) =>
    unreadPrivateChats[buildPrivateChatKey(chatNickname, productId)] || 0

  useEffect(() => {
    if (!nickname || typeof window === 'undefined') return

    setHasRestoredChats(false)
    productIdFromUrlRef.current = null

    const fromWindow = new URLSearchParams(window.location.search)
    const urlNickname = searchParams.get('nickname') || fromWindow.get('nickname') || ''
    const urlProductId = searchParams.get('productId') || fromWindow.get('productId') || ''

    const openChatsKey = `chat:${nickname}:openPrivateChats`
    const activeChatKey = `chat:${nickname}:activePrivateChat`
    const activeProductKey = `chat:${nickname}:activePrivateProduct`

    const storedOpen = window.localStorage.getItem(openChatsKey)
    let openList: string[] = []
    if (storedOpen) {
      try {
        const parsed = JSON.parse(storedOpen)
        if (Array.isArray(parsed)) {
          openList = parsed.filter((item) => typeof item === 'string')
        }
      } catch {
        window.localStorage.removeItem(openChatsKey)
      }
    }

    if (urlNickname) {
      productIdFromUrlRef.current = urlProductId || null
      setActivePrivateChat(urlNickname)
      setActivePrivateTab(urlProductId ? urlProductId : 'general')
      setOpenPrivateChats((prev) => {
        const next = openList.length ? openList : prev
        return next.includes(urlNickname) ? next : [...next, urlNickname]
      })
      setHasRestoredChats(true)
      return
    }

    if (openList.length) setOpenPrivateChats(openList)

    const storedActive = window.localStorage.getItem(activeChatKey)
    if (storedActive) {
      setActivePrivateChat(storedActive)
      setOpenPrivateChats((prev) =>
        prev.includes(storedActive) ? prev : [...prev, storedActive]
      )
    }

    const storedActiveProduct = window.localStorage.getItem(activeProductKey)
    if (storedActiveProduct) {
      setActivePrivateTab(storedActiveProduct)
    }

    setHasRestoredChats(true)
  }, [nickname, searchParams])

  // Quan la URL té nickname + productId (p. ex. des del botó Contactar del producte), forçar xat d’aquest producte
  useEffect(() => {
    if (typeof window === 'undefined') return
    const params = new URLSearchParams(window.location.search)
    const urlNickname = params.get('nickname')
    const urlProductId = params.get('productId')
    if (!urlNickname || !urlProductId) return
    productIdFromUrlRef.current = urlProductId
    setActivePrivateChat(urlNickname)
    setActivePrivateTab(urlProductId)
    setOpenPrivateChats((prev) => (prev.includes(urlNickname) ? prev : [...prev, urlNickname]))
  }, [searchParams])

  // Un cop muntat, re-aplicar nickname + productId des de la URL (evita que searchParams arribi tard)
  useEffect(() => {
    if (!nickname || typeof window === 'undefined') return
    const id = setTimeout(() => {
      const params = new URLSearchParams(window.location.search)
      const urlNickname = params.get('nickname')
      const urlProductId = params.get('productId')
      if (!urlNickname || !urlProductId) return
      productIdFromUrlRef.current = urlProductId
      setActivePrivateChat(urlNickname)
      setActivePrivateTab(urlProductId)
      setOpenPrivateChats((prev) => (prev.includes(urlNickname) ? prev : [...prev, urlNickname]))
    }, 0)
    return () => clearTimeout(id)
  }, [nickname])

  useEffect(() => {
    if (!activePrivateChat) {
      setActivePrivateTab(null)
      return
    }

    const cachedProducts = privateChatProductsRef.current[activePrivateChat]
    const alreadyFetched = privateChatProductsFetchedRef.current[activePrivateChat]
    if (cachedProducts && alreadyFetched) {
      setLoadingPrivateProducts((prev) => ({ ...prev, [activePrivateChat]: false }))
      if (activePrivateTab === null) {
        setActivePrivateTab('general')
        return
      }
      if (activePrivateTab !== 'general') {
        const hasActiveProduct = cachedProducts.some(
          (product) => product.id === activePrivateTab
        )
        const isFromUrl = productIdFromUrlRef.current === activePrivateTab
        if (!hasActiveProduct && !isFromUrl) {
          setActivePrivateTab('general')
        }
      }
      return
    }

    if (loadingPrivateProductsRef.current[activePrivateChat]) return

    let isCancelled = false
    setLoadingPrivateProducts((prev) => ({ ...prev, [activePrivateChat]: true }))

    const fetchProductsForUser = async (): Promise<ProductSummary[]> => {
      const userResponse = await fetch(
        `/api/users/${encodeURIComponent(activePrivateChat)}/products`,
        { cache: 'no-store' }
      )
      if (userResponse.ok) {
        const data = await userResponse.json()
        if (Array.isArray(data)) {
          logInfo('Productes del DM carregats', {
            nickname: activePrivateChat,
            count: data.length,
          })
          return data
        }
        logWarn('Resposta inesperada de productes del DM', data)
      } else {
        logWarn('Error carregant productes del DM', {
          nickname: activePrivateChat,
          status: userResponse.status,
        })
      }

      const fallbackResponse = await fetch('/api/products', { cache: 'no-store' })
      if (!fallbackResponse.ok) {
        logWarn('Error carregant productes (fallback)', {
          status: fallbackResponse.status,
        })
        return []
      }
      const fallbackData = await fallbackResponse.json()
      if (!Array.isArray(fallbackData)) {
        logWarn('Resposta inesperada de productes (fallback)', fallbackData)
        return []
      }
      const targetNickname = activePrivateChat.toLowerCase()
      return fallbackData.filter(
        (product: ProductSummary & { user?: { nickname?: string } }) =>
          product.user?.nickname?.toLowerCase() === targetNickname
      )
    }

    fetchProductsForUser()
      .then(async (products) => {
        if (isCancelled) return
        let list = Array.isArray(products) ? products : []
        const wantedProductId = activePrivateTab !== 'general' ? activePrivateTab : null
        const isFromUrl = wantedProductId && productIdFromUrlRef.current === wantedProductId
        if (wantedProductId && !list.some((p) => p.id === wantedProductId)) {
          if (isFromUrl) {
            try {
              const r = await fetch(`/api/products/${wantedProductId}`, { cache: 'no-store' })
              if (r.ok) {
                const one = await r.json()
                if (one?.id && one?.user?.nickname?.toLowerCase() === activePrivateChat.toLowerCase()) {
                  list = [{
                    id: one.id,
                    name: one.name ?? '',
                    images: one.images ?? [],
                    reserved: !!one.reserved,
                    reservedBy: one.reservedBy ?? null,
                  }, ...list]
                }
              }
            } catch {
              /* ignora */
            }
          }
        }
        setPrivateChatProducts((prev) => ({
          ...prev,
          [activePrivateChat]: list,
        }))
        setPrivateChatProductsFetched((prev) => ({
          ...prev,
          [activePrivateChat]: true,
        }))
        if (activePrivateTab === null) {
          setActivePrivateTab('general')
          return
        }
        if (activePrivateTab !== 'general') {
          const hasActiveProduct = list.some((product) => product.id === activePrivateTab)
          if (!hasActiveProduct && !isFromUrl) {
            setActivePrivateTab('general')
          }
        }
      })
      .catch(() => {
        if (!isCancelled) {
          setPrivateChatProducts((prev) => ({ ...prev, [activePrivateChat]: [] }))
          setActivePrivateTab('general')
          setPrivateChatProductsFetched((prev) => ({
            ...prev,
            [activePrivateChat]: true,
          }))
        }
      })
      .finally(() => {
        setLoadingPrivateProducts((prev) => ({ ...prev, [activePrivateChat]: false }))
      })

    return () => {
      isCancelled = true
      setLoadingPrivateProducts((prev) => ({ ...prev, [activePrivateChat]: false }))
    }
  }, [activePrivateChat, activePrivateTab])

  useEffect(() => {
    if (!nickname || typeof window === 'undefined' || !hasRestoredChats) return

    const openChatsKey = `chat:${nickname}:openPrivateChats`
    const activeChatKey = `chat:${nickname}:activePrivateChat`
    const activeProductKey = `chat:${nickname}:activePrivateProduct`

    window.localStorage.setItem(openChatsKey, JSON.stringify(openPrivateChats))
    if (activePrivateChat) {
      window.localStorage.setItem(activeChatKey, activePrivateChat)
    } else {
      window.localStorage.removeItem(activeChatKey)
    }

    if (activePrivateTab) {
      window.localStorage.setItem(activeProductKey, activePrivateTab)
    } else {
      window.localStorage.removeItem(activeProductKey)
    }
  }, [nickname, openPrivateChats, activePrivateChat, activePrivateTab, hasRestoredChats])

  useEffect(() => {
    const onProductState = (e: Event) => {
      const { productId: id, reserved, reservedBy } = (e as CustomEvent).detail || {}
      if (!id || typeof reserved !== 'boolean') return
      setPrivateChatProducts((prev) => {
        const next = { ...prev }
        for (const chatNickname of Object.keys(next)) {
          const list = next[chatNickname]
          if (!Array.isArray(list)) continue
          const idx = list.findIndex((p) => p.id === id)
          if (idx === -1) continue
          next[chatNickname] = list.map((p, i) =>
            i !== idx ? p : { ...p, reserved, reservedBy: reservedBy ?? null }
          )
        }
        return next
      })
    }
    window.addEventListener('product-state', onProductState)
    return () => window.removeEventListener('product-state', onProductState)
  }, [])

  const getConfettiCanvas = useCallback(() => {
    if (typeof window === 'undefined') return null
    let canvas = confettiCanvasRef.current
    if (!canvas) {
      canvas = document.createElement('canvas')
      confettiCanvasRef.current = canvas
      canvas.style.position = 'fixed'
      canvas.style.left = '0'
      canvas.style.top = '0'
      canvas.style.width = '100vw'
      canvas.style.height = '100vh'
      canvas.style.pointerEvents = 'none'
      canvas.style.zIndex = '9999'
      document.body.appendChild(canvas)
    }
    const w = window.innerWidth
    const h = window.innerHeight
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w
      canvas.height = h
    }
    return canvas
  }, [])

  useEffect(() => {
    if (typeof window === 'undefined' || !activePrivateChat || !activePrivateTab || activePrivateTab === 'general' || !nickname) {
      if (!activePrivateTab || activePrivateTab === 'general') {
        confettiFiredForProductRef.current = null
      }
      return
    }
    const products = privateChatProducts[activePrivateChat]
    const product = Array.isArray(products) ? products.find((p) => p.id === activePrivateTab) : null
    const reservedByYou = !!product?.reserved && product.reservedBy?.nickname === nickname
    if (!reservedByYou) return
    if (confettiFiredForProductRef.current === activePrivateTab) return
    confettiFiredForProductRef.current = activePrivateTab
    const opts = {
      spread: 120,
      ticks: 100,
      particleCount: 120,
      startVelocity: 40,
      origin: { x: 0.5, y: 0.5 } as const,
    }
    const fireConfetti = (confetti: (o: typeof opts & { angle?: number }) => void) => {
      try {
        confetti(opts)
        setTimeout(() => confetti({ ...opts, angle: 60 }), 80)
        setTimeout(() => confetti({ ...opts, angle: 120 }), 160)
      } catch (e) {
        confettiFiredForProductRef.current = null
        logWarn('Confetti error', e)
      }
    }
    const runAfterPaint = () => {
      if (confettiModuleRef.current) {
        fireConfetti(confettiModuleRef.current)
        return
      }
      import('canvas-confetti')
        .then((mod) => {
          const m = mod as { default?: (o?: object) => void; create?: (c?: HTMLCanvasElement, o?: { useWorker?: boolean }) => (o?: object) => void }
          const canvas = getConfettiCanvas()
          const fn = typeof m.create === 'function' && canvas
            ? m.create(canvas, { useWorker: false })
            : (m.default ?? (m as unknown as (o?: object) => void))
          fireConfetti(fn)
        })
        .catch((err) => {
          confettiFiredForProductRef.current = null
          logWarn('Confetti no disponible', err)
        })
    }
    setTimeout(runAfterPaint, 200)
  }, [activePrivateChat, activePrivateTab, nickname, privateChatProducts, getConfettiCanvas])

  useEffect(() => {
    if (typeof window === 'undefined') return
    import('canvas-confetti').then((mod) => {
      const m = mod as { default?: (o?: object) => void; create?: (canvas?: HTMLCanvasElement, opts?: { useWorker?: boolean }) => (o?: object) => void }
      const create = m.create
      if (typeof create === 'function') {
        const canvas = getConfettiCanvas()
        confettiModuleRef.current = canvas ? create(canvas, { useWorker: false }) : (m.default ?? (m as unknown as (o?: object) => void))
      } else {
        confettiModuleRef.current = m.default ?? (m as unknown as (o?: object) => void)
      }
    }).catch(() => {})
  }, [getConfettiCanvas])

  // Refetch de productes quan s’obre des del link (Contactar): la 1a càrrega pot arribar abans que el servidor hagi desat la reserva
  useEffect(() => {
    const productIdFromUrl = productIdFromUrlRef.current
    if (!productIdFromUrl || activePrivateTab !== productIdFromUrl || !activePrivateChat || refetchForProductUrlDoneRef.current === productIdFromUrl) return
    if (!privateChatProductsFetched[activePrivateChat]) return
    const t = setTimeout(() => {
      refetchForProductUrlDoneRef.current = productIdFromUrl
      fetch(`/api/users/${encodeURIComponent(activePrivateChat)}/products`, { cache: 'no-store' })
        .then((r) => r.ok ? r.json() : [])
        .then((data) => {
          if (!Array.isArray(data)) return
          setPrivateChatProducts((prev) => ({
            ...prev,
            [activePrivateChat]: data.map((p: ProductSummary) => ({
              id: p.id,
              name: p.name,
              images: p.images ?? [],
              reserved: !!p.reserved,
              reservedBy: p.reservedBy ?? null,
            })),
          }))
        })
        .catch(() => {})
    }, 700)
    return () => clearTimeout(t)
  }, [activePrivateChat, activePrivateTab, privateChatProductsFetched])

  // Funció per obtenir la data formatada
  const getDateLabel = (date: Date): string => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)
    const messageDate = new Date(date)
    messageDate.setHours(0, 0, 0, 0)

    if (messageDate.getTime() === today.getTime()) {
      return t('chat.today')
    } else if (messageDate.getTime() === yesterday.getTime()) {
      return t('chat.yesterday')
    } else {
      const localeMap: Record<string, string> = {
        'ca': 'ca-ES',
        'es': 'es-ES',
        'en': 'en-US',
      }
      return messageDate.toLocaleDateString(localeMap[locale] || 'ca-ES', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    }
  }

  // Funció per comprovar si hi ha canvi de dia
  const isNewDay = (currentDate: string, previousDate: string | null): boolean => {
    if (!previousDate) return true
    const current = new Date(currentDate)
    const previous = new Date(previousDate)
    return (
      current.getDate() !== previous.getDate() ||
      current.getMonth() !== previous.getMonth() ||
      current.getFullYear() !== previous.getFullYear()
    )
  }

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    if (!nickname) return

    const socketUrl = getSocketUrl()

    // Si no hi ha URL configurada i estem a producció, desactivar Socket.io
    if (!socketUrl) {
      logWarn('⚠️ Socket.io desactivat a producció. Configura NEXT_PUBLIC_SOCKET_URL per activar el xat.')
      logWarn('   Configura a Vercel: NEXT_PUBLIC_SOCKET_URL=https://xarxanglesola-production.up.railway.app')
      setConnected(false)
      return
    }
    
    logInfo('  → URL final del socket:', socketUrl)
    
    logInfo('=== DIAGNÒSTIC DE CONNEXIÓ SOCKET.IO ===')
    logInfo('URL del socket:', socketUrl)
    logInfo('Origin actual:', typeof window !== 'undefined' ? window.location.origin : 'N/A')
    logInfo('Hostname:', typeof window !== 'undefined' ? window.location.hostname : 'N/A')
    logInfo('Protocol:', typeof window !== 'undefined' ? window.location.protocol : 'N/A')
    logInfo('Port:', typeof window !== 'undefined' ? window.location.port : 'N/A')
    logInfo('User Agent:', typeof window !== 'undefined' ? window.navigator.userAgent : 'N/A')
    logInfo('URL completa:', typeof window !== 'undefined' ? window.location.href : 'N/A')
    logInfo('========================================')
    
    // Provar la connexió manualment abans de Socket.io (només en desenvolupament)
    if (typeof window !== 'undefined' && process.env.NODE_ENV !== 'production') {
      const testUrl = `${socketUrl}/socket.io/?EIO=4&transport=polling`
      logInfo('🔍 Provant connexió HTTP a:', testUrl)
      
      fetch(testUrl, {
        method: 'GET',
        mode: 'cors',
      })
        .then(response => {
          logInfo('✅ Test de connexió HTTP exitós:', {
            status: response.status,
            statusText: response.statusText,
          })
          logInfo('Headers:', Object.fromEntries(response.headers.entries()))
        })
        .catch(error => {
          logError('❌ Test de connexió HTTP fallat:', error)
          logError('Error details:', {
            name: error.name,
            message: error.message,
            stack: error.stack
          })
          logError('URL intentada:', testUrl)
        })
    }
    
    const socketToken = getStoredSocketToken()
    if (!socketToken) {
      logWarn('⚠️ Socket auth token absent. Torna a iniciar sessió.')
      setConnected(false)
      return
    }
    const newSocket = io(socketUrl, {
      auth: { token: socketToken },
      transports: ['polling', 'websocket'], // Polling primer per millor compatibilitat
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 20000,
      forceNew: false,
      upgrade: true,
      rememberUpgrade: true,
      autoConnect: true,
    })

    newSocket.on('connect', () => {
      logInfo('Connectat a Socket.io')
      setConnected(true)
      newSocket.emit('join-general')
    })

    newSocket.on('connect_error', (error: any) => {
      logError('❌ Error de connexió Socket.io:', error)
      logError('Detalls de l\'error:', {
        message: error.message,
        type: error.type,
        description: error.description,
        transport: error.transport,
        context: error.context
      })
      logError('URL intentada:', socketUrl)
      logError('Origin actual:', typeof window !== 'undefined' ? window.location.origin : 'N/A')
      
      // Missatges d'ajuda específics segons l'error
      let causaProbable = 'Error desconegut - Revisa els logs del servidor'
      let solucions: string[] = []
      
      if (error.description === 404 || error.message?.includes('404')) {
        causaProbable = '404 Not Found - El servidor Socket.io no està disponible a aquesta URL'
        solucions = [
          '1. Verifica que el servidor Socket.io estigui engegat a Railway',
          '2. Verifica que NEXT_PUBLIC_SOCKET_URL sigui correcta (ha de ser la URL completa sense port)',
          '3. Verifica que Railway permeti connexions al servidor Socket.io',
          '4. Comprova els logs del servidor a Railway per veure errors'
        ]
      } else if (error.message?.includes('CORS')) {
        causaProbable = 'CORS - El servidor no permet connexions des d\'aquest origen'
        solucions = [
          '1. Configura NEXT_PUBLIC_ALLOWED_ORIGINS a Railway amb: https://xarxanglesola.vercel.app',
          '2. Verifica que el servidor Socket.io a Railway tingui CORS configurat correctament'
        ]
      } else if (error.message?.includes('timeout')) {
        causaProbable = 'Timeout - El servidor no respon'
        solucions = [
          '1. Verifica que el servidor Socket.io estigui actiu a Railway',
          '2. Verifica la connexió de xarxa',
          '3. Comprova els logs del servidor a Railway'
        ]
      } else if (error.message?.includes('ECONNREFUSED')) {
        causaProbable = 'Connexió refusada - El servidor no està disponible'
        solucions = [
          '1. Verifica que NEXT_PUBLIC_SOCKET_URL sigui correcta',
          '2. Verifica que el servidor Socket.io estigui engegat a Railway',
          '3. Verifica que Railway permeti connexions externes'
        ]
      }
      
      logError('Causa probable:', causaProbable)
      if (solucions.length > 0) {
        logError('Solucions suggerides:')
        solucions.forEach(sol => logError('  ' + sol))
      }
      
      setConnected(false)
    })

    newSocket.on('reconnect_attempt', (attemptNumber: number) => {
      logInfo(`🔄 Intentant reconnexió (intent ${attemptNumber}/10)...`)
    })

    newSocket.on('reconnect', (attemptNumber: number) => {
      logInfo(`✅ Reconnexió exitosa després de ${attemptNumber} intents`)
      setConnected(true)
      if (!activePrivateChat) {
        newSocket.emit('join-general')
      }
    })

    newSocket.on('reconnect_error', (error: any) => {
      logError('❌ Error en reconnexió:', error)
    })

    newSocket.on('reconnect_failed', () => {
      logError('❌ Fallida la reconnexió després de tots els intents')
      logError('Verifica:')
      logError('  1. NEXT_PUBLIC_SOCKET_URL està ben configurada a Vercel?')
      logError('  2. NEXT_PUBLIC_ALLOWED_ORIGINS inclou la URL de Vercel a Railway?')
      logError('  3. El servidor Socket.IO a Railway està actiu?')
      logError('  4. La URL usa HTTPS si Railway ho requereix?')
      setConnected(false)
    })

    newSocket.on('disconnect', () => {
      logInfo('Desconnectat de Socket.io')
      setConnected(false)
    })

    newSocket.on('session-terminated', (data: { message?: string }) => {
      logInfo('Sessió terminada:', data.message)
      showInfo(
        t('notifications.sessionTerminated') || 'Sessió tancada',
        data.message || t('notifications.sessionTerminatedMessage') || 'Una nova sessió s\'ha obert des d\'un altre dispositiu.',
        {
          duration: 0, // No tancar automàticament
          action: {
            label: t('common.close') || 'Tancar',
            onClick: () => {
              if (typeof window !== 'undefined') {
                localStorage.removeItem('nickname')
                  localStorage.removeItem('socketToken')
                window.location.href = '/'
              }
            }
          }
        }
      )
    })

    newSocket.on('general-message', (message: Message) => {
      setMessages((prev) => [...prev, message])
      // Notificació només si no estàs a la pàgina de xat o no estàs al xat general
      if (typeof window !== 'undefined' && !window.location.pathname.includes('/chat')) {
        showInfo(
          t('notifications.newMessage') || 'Nou missatge',
          `${message.userNickname}: ${message.content}`,
          {
            action: {
              label: t('notifications.view') || 'Veure',
              onClick: () => router.push('/app/chat')
            }
          }
        )
      }
    })

    newSocket.on('private-message', (message: Message) => {
      const otherUserNickname = message.userNickname === nickname 
        ? activePrivateChat 
        : message.userNickname
      const messageProductId = message.productId ?? activePrivateProductIdRef.current ?? null
      
      if (otherUserNickname) {
        const chatKey = buildPrivateChatKey(otherUserNickname, messageProductId)
        setOpenPrivateChats((prev) => {
          if (!prev.includes(otherUserNickname)) {
            return [...prev, otherUserNickname]
          }
          return prev
        })
        
        setPrivateChats((prev) => ({
          ...prev,
          [chatKey]: [...(prev[chatKey] || []), message],
        }))
        if (
          activePrivateChat === otherUserNickname &&
          activePrivateProductIdRef.current === messageProductId
        ) {
          scrollToBottom()
        } else {
          setUnreadPrivateChats((prev) => ({
            ...prev,
            [chatKey]: (prev[chatKey] || 0) + 1,
          }))
          // Notificació si no estàs al xat privat actiu o no estàs a la pàgina de xat
          if (typeof window !== 'undefined' && 
              (!window.location.pathname.includes('/chat') || activePrivateChat !== otherUserNickname)) {
            showInfo(
              t('notifications.newPrivateMessage') || 'Nou missatge privat',
              `${message.userNickname}: ${message.content}`,
              {
                action: {
                  label: t('notifications.view') || 'Veure',
                  onClick: () => router.push(`/app/chat?nickname=${otherUserNickname}`)
                }
              }
            )
          }
        }
      }
    })

    newSocket.on('online-users', (users: string[]) => {
      setOnlineUsers(users)
    })

    // Escoltar notificacions de l'aplicació
    newSocket.on('app-notification', (data: { type: string; title: string; message: string; action?: { label: string; onClick: () => void } }) => {
      showInfo(data.title, data.message, {
        type: data.type as 'info' | 'success' | 'warning' | 'error',
        action: data.action,
      })
    })

    newSocket.on('load-messages', (loadedMessages: Message[]) => {
      setMessages(loadedMessages)
    })

    newSocket.on('load-private-messages', (data: { messages: Message[]; productId?: string | null }) => {
      if (activePrivateChat) {
        const productIdFromData = data.productId ?? activePrivateProductIdRef.current ?? null
        const chatKey = buildPrivateChatKey(activePrivateChat, productIdFromData)
        setOpenPrivateChats((prev) => {
          if (!prev.includes(activePrivateChat)) {
            return [...prev, activePrivateChat]
          }
          return prev
        })
        
        setPrivateChats((prev) => ({
          ...prev,
          [chatKey]: data.messages,
        }))
      }
    })

    setSocket(newSocket)

    const targetNickname = searchParams.get('nickname')
    const targetProductId = searchParams.get('productId')
    if (targetNickname && targetProductId && nickname && nickname !== targetNickname) {
      fetch(`/api/products/${targetProductId}/reserve-on-dm-open`, { method: 'POST' }).catch(() => {})
    }

    return () => {
      newSocket.close()
    }
  }, [nickname, activePrivateChat, router, showInfo, t, searchParams])

  useEffect(() => {
    scrollToBottom()
  }, [messages, privateChats, activePrivateChat, activePrivateTab])

  useEffect(() => {
    if (!hasRestoredChats) return
    if (activePrivateChat && !openPrivateChats.includes(activePrivateChat)) {
      setActivePrivateChat(null)
      setActivePrivateTab(null)
    }
  }, [activePrivateChat, openPrivateChats, hasRestoredChats])

  useEffect(() => {
    if (!activePrivateChat) return
    setUnreadPrivateChats((prev) => {
      const chatKey = buildPrivateChatKey(
        activePrivateChat,
        resolveActiveProductId(activePrivateTab)
      )
      if (!prev[chatKey]) return prev
      const next = { ...prev }
      delete next[chatKey]
      return next
    })
  }, [activePrivateChat, activePrivateTab])

  useEffect(() => {
    if (!activePrivateChat && socket && connected) {
      socket.emit('join-general')
    }
  }, [activePrivateChat, socket, connected])

  useEffect(() => {
    if (!socket || !connected) return
    if (!activePrivateChat || activePrivateTab === null) return

    socket.emit('join-private', {
      targetNickname: activePrivateChat,
      productId: resolveActiveProductId(activePrivateTab),
    })
    socket.emit('load-private-messages', {
      targetNickname: activePrivateChat,
      productId: resolveActiveProductId(activePrivateTab),
    })
  }, [socket, connected, activePrivateChat, activePrivateTab])

  // Gestió de reconnexió quan el socket es reconecta
  useEffect(() => {
    if (!socket || !connected) return
    if (activePrivateChat && activePrivateTab !== null) {
      socket.emit('join-private', {
        targetNickname: activePrivateChat,
        productId: resolveActiveProductId(activePrivateTab),
      })
      socket.emit('load-private-messages', {
        targetNickname: activePrivateChat,
        productId: resolveActiveProductId(activePrivateTab),
      })
      return
    }

    if (!activePrivateChat) {
      socket.emit('join-general')
    }
  }, [socket, connected, activePrivateChat, activePrivateTab])

  const sendMessage = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newMessage.trim() || !socket || !connected) return

    if (activePrivateChat) {
      if (activePrivateTab === null) return
      socket.emit('private-message', {
        content: newMessage,
        targetNickname: activePrivateChat,
        productId: resolveActiveProductId(activePrivateTab),
      })
    } else {
      socket.emit('general-message', { content: newMessage })
    }

    setNewMessage('')
  }

  const startPrivateChat = (targetNickname: string) => {
    if (!socket) return
    setActivePrivateChat(targetNickname)
    setActivePrivateTab('general')
    setOpenPrivateChats((prev) => {
      if (!prev.includes(targetNickname)) {
        return [...prev, targetNickname]
      }
      return prev
    })
    setUnreadPrivateChats((prev) => {
      const next = { ...prev }
      Object.keys(next).forEach((key) => {
        if (key.startsWith(`${targetNickname}::`)) {
          delete next[key]
        }
      })
      return next
    })
    socket.emit('join-private', {
      targetNickname,
      productId: null,
    })
    socket.emit('load-private-messages', {
      targetNickname,
      productId: null,
    })
  }

  const closePrivateChat = (targetNickname: string, e: React.MouseEvent) => {
    e.stopPropagation()
    setOpenPrivateChats((prev) => prev.filter((nick) => nick !== targetNickname))
    setUnreadPrivateChats((prev) => {
      const next = { ...prev }
      Object.keys(next).forEach((key) => {
        if (key.startsWith(`${targetNickname}::`)) {
          delete next[key]
        }
      })
      return next
    })
    if (activePrivateChat === targetNickname) {
      setActivePrivateChat(null)
      setActivePrivateTab(null)
    }
  }

  const currentMessages = activePrivateChat
    ? activePrivateTab !== null
      ? privateChats[
          buildPrivateChatKey(activePrivateChat, resolveActiveProductId(activePrivateTab))
        ] || []
      : []
    : messages

  // Detectar si estem a producció (Vercel) i si Socket.IO està configurat
  const isProduction = typeof window !== 'undefined' && 
                       (window.location.hostname.includes('vercel.app') || 
                        window.location.hostname.includes('vercel.com'))
  const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL
  const showSocketWarning = isProduction && !socketUrl && !connected
  const activePrivateProducts = activePrivateChat
    ? privateChatProducts[activePrivateChat] || []
    : []
  const isPrivateProductsLoading = activePrivateChat
    ? !!loadingPrivateProducts[activePrivateChat]
    : false
  const canSendMessage = connected && (!activePrivateChat || activePrivateTab !== null)

  return (
    <div className="max-w-7xl mx-auto px-2 sm:px-4 lg:px-8 py-2 sm:py-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md dark:shadow-gray-900 overflow-hidden h-[calc(100vh-12rem)] sm:h-[calc(100vh-7rem)] flex flex-col">
        {showSocketWarning && (
          <div className="bg-yellow-50 dark:bg-yellow-900/20 border-b border-yellow-200 dark:border-yellow-800 px-4 py-3 text-center">
            <p className="text-sm text-yellow-800 dark:text-yellow-200">
              {t('chat.disabledProduction') || 'El xat requereix configuració. Configura NEXT_PUBLIC_SOCKET_URL per activar-lo.'}
            </p>
          </div>
        )}
        <div className="border-b dark:border-gray-700 bg-gray-50 dark:bg-gray-900 px-4 py-2 flex items-center gap-2 overflow-x-auto flex-shrink-0">
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              setActivePrivateChat(null)
              setActivePrivateTab(null)
              if (socket && connected) {
                socket.emit('join-general')
              }
            }}
            className={`flex items-center gap-2 px-4 py-2 rounded-t-lg whitespace-nowrap transition cursor-pointer ${
              !activePrivateChat
                ? 'bg-white dark:bg-gray-800 text-blue-700 dark:text-blue-400 border-b-2 border-blue-700 dark:border-blue-400 font-semibold'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
            }`}
          >
            <span>{t('chat.general')}</span>
          </button>
          
          {openPrivateChats.map((chatNickname) => (
            <button
              key={chatNickname}
              onClick={() => {
                setActivePrivateChat(chatNickname)
                setActivePrivateTab('general')
                setUnreadPrivateChats((prev) => {
                  return prev
                })
              }}
              className={`flex items-center gap-2 px-4 py-2 rounded-t-lg whitespace-nowrap transition relative group ${
                activePrivateChat === chatNickname
                  ? 'bg-white dark:bg-gray-800 text-blue-700 dark:text-blue-400 border-b-2 border-blue-700 dark:border-blue-400 font-semibold'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              {hasUnreadForUser(chatNickname) ? (
                <span className="absolute -top-1 -right-[0.125rem] h-3 w-3 rounded-full bg-red-500 z-10 ring-2 ring-white dark:ring-gray-800" />
              ) : null}
              <span>{t('chat.privateWith', { nickname: chatNickname })}</span>
              <span
                role="button"
                tabIndex={0}
                onClick={(e) => closePrivateChat(chatNickname, e as unknown as React.MouseEvent)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    closePrivateChat(chatNickname, e as unknown as React.MouseEvent)
                  }
                }}
                className="ml-1 w-5 h-5 flex items-center justify-center rounded-full hover:bg-red-100 hover:text-red-600 transition opacity-0 group-hover:opacity-100"
                title={t('chat.closeChat')}
                aria-label={t('chat.closeChat')}
              >
                <svg
                  className="w-3 h-3"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </span>
            </button>
          ))}

        </div>

        {activePrivateChat && (
          <div className="border-b dark:border-gray-700 bg-white dark:bg-gray-900 px-4 py-2 flex items-center gap-2 overflow-x-auto flex-shrink-0">
            <button
              type="button"
              onClick={() => {
                setActivePrivateTab('general')
                setUnreadPrivateChats((prev) => {
                  const chatKey = buildPrivateChatKey(activePrivateChat, null)
                  if (!prev[chatKey]) return prev
                  const next = { ...prev }
                  delete next[chatKey]
                  return next
                })
              }}
              className={`relative flex items-center gap-2 px-3 py-2 rounded-md whitespace-nowrap transition ${
                activePrivateTab === 'general'
                  ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              <span className="text-xs sm:text-sm font-medium">
                {activePrivateChat || t('chat.generalDm') || 'General'}
              </span>
              {getUnreadForProduct(activePrivateChat, null) > 0 && (
                <span className="absolute -top-1 -right-1 h-2.5 w-2.5 rounded-full bg-red-500 ring-2 ring-white dark:ring-gray-800" />
              )}
            </button>

            {isPrivateProductsLoading && (
              <span className="text-xs text-gray-500 dark:text-gray-400">
                {t('common.loading') || 'Carregant...'}
              </span>
            )}
            {!isPrivateProductsLoading &&
              activePrivateProducts.map((product) => {
                const isActive = activePrivateTab === product.id
                const unreadCount = getUnreadForProduct(activePrivateChat, product.id)
                const thumbnail = product.images?.[0] || '/logo.png'

                return (
                  <button
                    key={product.id}
                    type="button"
                    onClick={() => {
                      setActivePrivateTab(product.id)
                      setUnreadPrivateChats((prev) => {
                        const chatKey = buildPrivateChatKey(activePrivateChat, product.id)
                        if (!prev[chatKey]) return prev
                        const next = { ...prev }
                        delete next[chatKey]
                        return next
                      })
                    }}
                    className={`relative flex items-center gap-2 px-3 py-2 rounded-md whitespace-nowrap transition ${
                      isActive
                        ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                    }`}
                  >
                    <Image
                      src={thumbnail}
                      alt={product.name}
                      width={24}
                      height={24}
                      unoptimized
                      className="h-6 w-6 rounded object-cover"
                    />
                    <span className="text-xs sm:text-sm font-medium">
                      {product.name}
                    </span>
                    {unreadCount > 0 && (
                      <span className="absolute -top-1 -right-1 h-2.5 w-2.5 rounded-full bg-red-500 ring-2 ring-white dark:ring-gray-800" />
                    )}
                  </button>
                )
              })}
          </div>
        )}

        <div className="flex-1 flex flex-col sm:flex-row overflow-hidden">
          <div className="flex-1 flex flex-col overflow-hidden">
            <div className="flex-1 overflow-y-auto p-2 sm:p-4 space-y-2 sm:space-y-4">
              {activePrivateChat && activePrivateTab !== null && activePrivateTab !== 'general' && (() => {
                const activeProduct = activePrivateProducts.find((p) => p.id === activePrivateTab)
                if (!activeProduct?.reserved) return null
                const reservedByYou = !!nickname && activeProduct.reservedBy?.nickname === nickname
                return (
                  <div className="flex-shrink-0 mb-2 px-3 py-2 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
                    <p className="text-sm text-amber-800 dark:text-amber-200">
                      {reservedByYou ? t('products.reservedByYou') : t('products.reserved')}
                    </p>
                  </div>
                )
              })()}
              {activePrivateChat && activePrivateTab === null ? (
                <div className="text-center text-gray-500 dark:text-gray-400 mt-8">
                  {t('chat.selectProduct') || 'Selecciona un producte per començar el xat.'}
                </div>
              ) : currentMessages.length === 0 ? (
                <div className="text-center text-gray-500 dark:text-gray-400 mt-8">
                  {t('chat.noMessages')}
                </div>
              ) : (
                currentMessages.map((message, index) => {
                  const previousMessage = index > 0 ? currentMessages[index - 1] : null
                  const showDateSeparator = isNewDay(
                    message.createdAt,
                    previousMessage?.createdAt || null
                  )

                  return (
                    <div key={message.id}>
                      {showDateSeparator && (
                        <div className="flex items-center justify-center my-4">
                          <div className="flex items-center gap-2 px-3 py-1 bg-gray-100 dark:bg-gray-700 rounded-full">
                            <span className="text-xs text-gray-600 dark:text-gray-300 font-medium">
                              {getDateLabel(new Date(message.createdAt))}
                            </span>
                          </div>
                        </div>
                      )}
                      <div
                        className={`flex ${
                          message.userNickname === nickname ? 'justify-end' : 'justify-start'
                        }`}
                      >
                      <div
                        className={`max-w-[85%] sm:max-w-xs lg:max-w-md px-3 sm:px-4 py-2 rounded-lg ${
                          message.userNickname === nickname
                            ? 'bg-blue-600 dark:bg-blue-700 text-white'
                            : 'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white'
                        }`}
                      >
                          {!activePrivateChat && (
                            <div className={`text-xs font-semibold mb-1 ${
                              message.userNickname === nickname ? 'opacity-90' : 'opacity-75'
                            }`}>
                              {message.userNickname}
                            </div>
                          )}
                          {activePrivateChat && message.userNickname !== nickname && (
                            <div className="text-xs font-semibold mb-1 opacity-75">
                              {message.userNickname}
                            </div>
                          )}
                          <div><TranslateButton text={message.content} /></div>
                          <div className={`flex items-center justify-between mt-1 ${
                            message.userNickname === nickname ? 'opacity-90' : 'opacity-75'
                          }`}>
                            <span className="text-xs">
                              {new Date(message.createdAt).toLocaleTimeString(
                                locale === 'ca' ? 'ca-ES' : locale === 'es' ? 'es-ES' : 'en-US',
                                {
                                  hour: '2-digit',
                                  minute: '2-digit',
                                }
                              )}
                            </span>
                            {!activePrivateChat && message.userNickname !== nickname && (
                              <button
                                onClick={() => startPrivateChat(message.userNickname)}
                                className="ml-2 p-1 rounded-full hover:bg-gray-300 dark:hover:bg-gray-600 transition"
                                title={t('chat.startPrivateChat', { nickname: message.userNickname })}
                              >
                                <svg
                                  className="w-4 h-4"
                                  fill="none"
                                  stroke="currentColor"
                                  viewBox="0 0 24 24"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                                  />
                                </svg>
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            <form onSubmit={sendMessage} className="p-2 sm:p-4 border-t dark:border-gray-700 bg-white dark:bg-gray-800 flex-shrink-0">
              <div className="flex space-x-2">
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder={
                    activePrivateChat
                      ? (activePrivateTab !== null
                        ? t('chat.writePrivateMessage')
                        : t('chat.selectProduct'))
                      : t('chat.writeMessage')
                  }
                  className="flex-1 px-2 sm:px-4 py-2 text-sm sm:text-base border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  disabled={!canSendMessage}
                />
                <button
                  type="submit"
                  disabled={!canSendMessage || !newMessage.trim()}
                  className="bg-blue-600 dark:bg-blue-700 text-white px-3 sm:px-6 py-2 rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 text-sm sm:text-base"
                >
                  {t('chat.send')}
                </button>
              </div>
              {!connected && socketUrl && (
                <div className="mt-2">
                  <p className="text-sm text-red-500 dark:text-red-400">{t('chat.connecting')}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Verifica la consola del navegador per veure errors de connexió
                  </p>
                </div>
              )}
            </form>
          </div>
          
          <div className="hidden sm:block sm:w-40 md:w-64 border-l dark:border-gray-700 bg-gray-50 dark:bg-gray-900 p-4 overflow-y-auto flex-shrink-0">
            <h2 className="font-semibold text-gray-900 dark:text-white mb-4 text-sm sm:text-base">{t('chat.onlineUsers')}</h2>
            <div className="space-y-2">
              {onlineUsers
                .filter((user) => user !== nickname)
                .map((user) => (
                  <button
                    key={user}
                    onClick={() => startPrivateChat(user)}
                    className={`w-full text-left px-3 py-2 rounded ${
                      activePrivateChat === user
                        ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300'
                        : 'hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300'
                    }`}
                  >
                    👤 {user}
                  </button>
                ))}
            </div>
          </div>
        </div>
      </div>

      {/* Botó/Pestanya expandible d'usuaris en línia a mòbil */}
      <div
        className={`sm:hidden fixed right-0 z-50 shadow-lg transition-all duration-300 ease-in-out overflow-hidden ${
          isOnlineUsersDrawerOpen
            ? 'top-[calc(4rem+1rem)] bottom-[calc(4rem+1rem)] w-64 rounded-l-lg bg-white dark:bg-gray-800 border-l-4 border-blue-600 dark:border-blue-700'
            : 'top-[calc(4rem+1rem)] h-auto w-auto rounded-l-lg bg-blue-600 dark:bg-blue-700'
        }`}
      >
        {/* Botó inicial */}
        {!isOnlineUsersDrawerOpen && (
          <button
            onClick={() => setIsOnlineUsersDrawerOpen(true)}
            className="px-3 py-2 text-white hover:bg-blue-700 dark:hover:bg-blue-600 transition w-full h-full flex items-center justify-center"
            title={t('chat.onlineUsers')}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
          </button>
        )}

        {/* Vista expandida d'usuaris en línia */}
        {isOnlineUsersDrawerOpen && (
          <div className="h-full bg-white dark:bg-gray-800 flex flex-col animate-slide-in-right">
            {/* Header */}
            <div className="px-4 py-3 border-b dark:border-gray-700 flex justify-between items-center flex-shrink-0">
              <h2 className="font-semibold text-gray-900 dark:text-white">{t('chat.onlineUsers')}</h2>
              <button
                onClick={() => setIsOnlineUsersDrawerOpen(false)}
                className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Llista d'usuaris */}
            <div className="flex-1 overflow-y-auto p-4">
              <div className="space-y-2">
                {onlineUsers
                  .filter((user) => user !== nickname)
                  .map((user) => (
                    <button
                      key={user}
                      onClick={() => {
                        startPrivateChat(user)
                        setIsOnlineUsersDrawerOpen(false)
                      }}
                      className={`w-full text-left px-3 py-2 rounded transition ${
                        activePrivateChat === user
                          ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300'
                          : 'hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300'
                      }`}
                    >
                      👤 {user}
                    </button>
                  ))}
                {onlineUsers.filter((user) => user !== nickname).length === 0 && (
                  <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">{t('chat.noOnlineUsers')}</p>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Overlay quan està obert */}
      {isOnlineUsersDrawerOpen && (
        <div
          className="sm:hidden fixed inset-0 bg-black bg-opacity-50 z-40 animate-fade-in"
          onClick={() => setIsOnlineUsersDrawerOpen(false)}
        />
      )}
    </div>
  )
}
