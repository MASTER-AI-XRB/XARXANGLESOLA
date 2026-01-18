'use client'

import { useState, useEffect, useRef } from 'react'
import { io, Socket } from 'socket.io-client'
import Link from 'next/link'
import { useI18n } from '@/lib/i18n'
import TranslateButton from '@/components/TranslateButton'

interface Message {
  id: string
  content: string
  userId: string
  userNickname: string
  roomId: string
  isPrivate: boolean
  createdAt: string
}

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [socket, setSocket] = useState<Socket | null>(null)
  const [connected, setConnected] = useState(false)
  const [privateChats, setPrivateChats] = useState<{ [key: string]: Message[] }>({})
  const [activePrivateChat, setActivePrivateChat] = useState<string | null>(null)
  const [openPrivateChats, setOpenPrivateChats] = useState<string[]>([])
  const [onlineUsers, setOnlineUsers] = useState<string[]>([])
  const [isOnlineUsersDrawerOpen, setIsOnlineUsersDrawerOpen] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  
  const userId = typeof window !== 'undefined' ? localStorage.getItem('userId') : null
  const nickname = typeof window !== 'undefined' ? localStorage.getItem('nickname') : null
  const { t, locale } = useI18n()

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
    if (!userId || !nickname) return

    // Detectar si estem a producció (Vercel)
    const isProduction = typeof window !== 'undefined' && 
                         (window.location.hostname.includes('vercel.app') || 
                          window.location.hostname.includes('vercel.com'))
    
    // Si estem a producció, desactivar Socket.io temporalment
    if (isProduction) {
      console.warn('Socket.io desactivat a producció. El xat no estarà disponible.')
      setConnected(false)
      return
    }

    // Detectar la URL del socket de manera més robusta
    let socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL
    
    if (!socketUrl && typeof window !== 'undefined') {
      const origin = window.location.origin
      const hostname = window.location.hostname
      
      console.log('🔍 Detectant URL del socket...')
      console.log('  Hostname detectat:', hostname)
      console.log('  Origin:', origin)
      
      // Si estem a localhost o 127.0.0.1, usar localhost:3001
      if (hostname === 'localhost' || hostname === '127.0.0.1') {
        socketUrl = 'http://localhost:3001'
        console.log('  → Usant localhost:3001')
      } else {
        // Per IPs locals, usar la mateixa IP que s'està usant per accedir a l'app
        // Usar directament el hostname de window.location que sempre serà correcte
        socketUrl = `http://${hostname}:3001`
        console.log('  → Usant hostname directe:', socketUrl)
        console.log('  → Verificació: hostname és', hostname, 'i origin és', origin)
      }
    }
    
    // Fallback final
    if (!socketUrl) {
      socketUrl = 'http://localhost:3001'
      console.log('  → Fallback: usant localhost:3001')
    }
    
    console.log('  → URL final del socket:', socketUrl)
    
    console.log('=== DIAGNÒSTIC DE CONNEXIÓ SOCKET.IO ===')
    console.log('URL del socket:', socketUrl)
    console.log('Origin actual:', typeof window !== 'undefined' ? window.location.origin : 'N/A')
    console.log('Hostname:', typeof window !== 'undefined' ? window.location.hostname : 'N/A')
    console.log('Protocol:', typeof window !== 'undefined' ? window.location.protocol : 'N/A')
    console.log('Port:', typeof window !== 'undefined' ? window.location.port : 'N/A')
    console.log('User Agent:', typeof window !== 'undefined' ? window.navigator.userAgent : 'N/A')
    console.log('URL completa:', typeof window !== 'undefined' ? window.location.href : 'N/A')
    console.log('========================================')
    
    // Provar la connexió manualment abans de Socket.io
    if (typeof window !== 'undefined') {
      const testUrl = `${socketUrl}/socket.io/?EIO=4&transport=polling`
      console.log('🔍 Provant connexió HTTP a:', testUrl)
      
      fetch(testUrl, {
        method: 'GET',
        mode: 'cors',
      })
        .then(response => {
          console.log('✅ Test de connexió HTTP exitós:', response.status, response.statusText)
          console.log('Headers:', Object.fromEntries(response.headers.entries()))
        })
        .catch(error => {
          console.error('❌ Test de connexió HTTP fallat:', error)
          console.error('Error details:', {
            name: error.name,
            message: error.message,
            stack: error.stack
          })
          console.error('URL intentada:', testUrl)
        })
    }
    
    const newSocket = io(socketUrl, {
      query: { userId, nickname },
      transports: ['polling', 'websocket'], // Polling primer per millor compatibilitat
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
      timeout: 45000,
      forceNew: true,
      upgrade: true,
      rememberUpgrade: false,
    })

    newSocket.on('connect', () => {
      console.log('Connectat a Socket.io')
      setConnected(true)
      newSocket.emit('join-general')
    })

    newSocket.on('connect_error', (error: any) => {
      console.error('Error de connexió Socket.io:', error)
      console.error('Detalls de l\'error:', {
        message: error.message,
        type: error.type,
        description: error.description,
        transport: error.transport,
        context: error.context
      })
      console.error('URL intentada:', socketUrl)
      setConnected(false)
    })

    newSocket.on('disconnect', () => {
      console.log('Desconnectat de Socket.io')
      setConnected(false)
    })

    newSocket.on('session-terminated', (data: { message?: string }) => {
      console.log('Sessió terminada:', data.message)
      alert(data.message || 'Una nova sessió s\'ha obert des d\'un altre dispositiu. Aquesta sessió s\'ha tancat.')
      // Redirigir a la pàgina de login
      if (typeof window !== 'undefined') {
        localStorage.removeItem('nickname')
        localStorage.removeItem('userId')
        window.location.href = '/'
      }
    })

    newSocket.on('general-message', (message: Message) => {
      setMessages((prev) => [...prev, message])
    })

    newSocket.on('private-message', (message: Message) => {
      const otherUserNickname = message.userId === userId 
        ? activePrivateChat 
        : message.userNickname
      
      if (otherUserNickname) {
        setOpenPrivateChats((prev) => {
          if (!prev.includes(otherUserNickname)) {
            return [...prev, otherUserNickname]
          }
          return prev
        })
        
        setPrivateChats((prev) => ({
          ...prev,
          [otherUserNickname]: [...(prev[otherUserNickname] || []), message],
        }))
        if (activePrivateChat === otherUserNickname) {
          scrollToBottom()
        }
      }
    })

    newSocket.on('online-users', (users: string[]) => {
      setOnlineUsers(users)
    })

    newSocket.on('load-messages', (loadedMessages: Message[]) => {
      setMessages(loadedMessages)
    })

    newSocket.on('load-private-messages', (data: { userId: string; messages: Message[] }) => {
      if (activePrivateChat) {
        setOpenPrivateChats((prev) => {
          if (!prev.includes(activePrivateChat)) {
            return [...prev, activePrivateChat]
          }
          return prev
        })
        
        setPrivateChats((prev) => ({
          ...prev,
          [activePrivateChat]: data.messages,
        }))
      }
    })

    setSocket(newSocket)

    const urlParams = new URLSearchParams(window.location.search)
    const targetNickname = urlParams.get('nickname')
    if (targetNickname) {
      setTimeout(() => {
        setActivePrivateChat(targetNickname)
        setOpenPrivateChats((prev) => {
          if (!prev.includes(targetNickname)) {
            return [...prev, targetNickname]
          }
          return prev
        })
        newSocket.emit('join-private', targetNickname)
        newSocket.emit('load-private-messages', targetNickname)
      }, 100)
    }

    return () => {
      newSocket.close()
    }
  }, [userId, nickname, activePrivateChat])

  useEffect(() => {
    scrollToBottom()
  }, [messages, privateChats, activePrivateChat])

  useEffect(() => {
    if (!activePrivateChat && socket && connected) {
      socket.emit('join-general')
    }
  }, [activePrivateChat, socket, connected])

  const sendMessage = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newMessage.trim() || !socket || !connected) return

    if (activePrivateChat) {
      socket.emit('private-message', {
        content: newMessage,
        targetNickname: activePrivateChat,
      })
    } else {
      socket.emit('general-message', { content: newMessage })
    }

    setNewMessage('')
  }

  const startPrivateChat = (targetNickname: string) => {
    if (!socket || !userId) return
    setActivePrivateChat(targetNickname)
    setOpenPrivateChats((prev) => {
      if (!prev.includes(targetNickname)) {
        return [...prev, targetNickname]
      }
      return prev
    })
    socket.emit('join-private', targetNickname)
    socket.emit('load-private-messages', targetNickname)
  }

  const closePrivateChat = (targetNickname: string, e: React.MouseEvent) => {
    e.stopPropagation()
    setOpenPrivateChats((prev) => prev.filter((nick) => nick !== targetNickname))
    if (activePrivateChat === targetNickname) {
      setActivePrivateChat(null)
    }
  }

  const currentMessages = activePrivateChat
    ? privateChats[activePrivateChat] || []
    : messages

  // Detectar si estem a producció (Vercel)
  const isProduction = typeof window !== 'undefined' && 
                       (window.location.hostname.includes('vercel.app') || 
                        window.location.hostname.includes('vercel.com'))

  return (
    <div className="max-w-7xl mx-auto px-2 sm:px-4 lg:px-8 py-2 sm:py-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md dark:shadow-gray-900 overflow-hidden h-[calc(100vh-12rem)] sm:h-[calc(100vh-7rem)] flex flex-col">
        {isProduction && (
          <div className="bg-yellow-50 dark:bg-yellow-900/20 border-b border-yellow-200 dark:border-yellow-800 px-4 py-3 text-center">
            <p className="text-sm text-yellow-800 dark:text-yellow-200">
              {t('chat.disabledProduction')}
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
              onClick={() => setActivePrivateChat(chatNickname)}
              className={`flex items-center gap-2 px-4 py-2 rounded-t-lg whitespace-nowrap transition relative group ${
                activePrivateChat === chatNickname
                  ? 'bg-white dark:bg-gray-800 text-blue-700 dark:text-blue-400 border-b-2 border-blue-700 dark:border-blue-400 font-semibold'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              <span>{t('chat.privateWith', { nickname: chatNickname })}</span>
              <button
                onClick={(e) => closePrivateChat(chatNickname, e)}
                className="ml-1 w-5 h-5 flex items-center justify-center rounded-full hover:bg-red-100 hover:text-red-600 transition opacity-0 group-hover:opacity-100"
                title={t('chat.closeChat')}
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
              </button>
            </button>
          ))}

        </div>

        <div className="flex-1 flex flex-col sm:flex-row overflow-hidden">
          <div className="flex-1 flex flex-col overflow-hidden">
            <div className="flex-1 overflow-y-auto p-2 sm:p-4 space-y-2 sm:space-y-4">
              {currentMessages.length === 0 ? (
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
                          message.userId === userId ? 'justify-end' : 'justify-start'
                        }`}
                      >
                      <div
                        className={`max-w-[85%] sm:max-w-xs lg:max-w-md px-3 sm:px-4 py-2 rounded-lg ${
                          message.userId === userId
                            ? 'bg-blue-600 dark:bg-blue-700 text-white'
                            : 'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white'
                        }`}
                      >
                          {!activePrivateChat && (
                            <div className={`text-xs font-semibold mb-1 ${
                              message.userId === userId ? 'opacity-90' : 'opacity-75'
                            }`}>
                              {message.userNickname}
                            </div>
                          )}
                          {activePrivateChat && message.userId !== userId && (
                            <div className="text-xs font-semibold mb-1 opacity-75">
                              {message.userNickname}
                            </div>
                          )}
                          <div><TranslateButton text={message.content} /></div>
                          <div className={`flex items-center justify-between mt-1 ${
                            message.userId === userId ? 'opacity-90' : 'opacity-75'
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
                            {!activePrivateChat && message.userId !== userId && (
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
                      ? t('chat.writePrivateMessage')
                      : t('chat.writeMessage')
                  }
                  className="flex-1 px-2 sm:px-4 py-2 text-sm sm:text-base border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  disabled={!connected}
                />
                <button
                  type="submit"
                  disabled={!connected || !newMessage.trim()}
                  className="bg-blue-600 dark:bg-blue-700 text-white px-3 sm:px-6 py-2 rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 text-sm sm:text-base"
                >
                  {t('chat.send')}
                </button>
              </div>
              {!connected && (
                <p className="text-sm text-red-500 dark:text-red-400 mt-2">{t('chat.connecting')}</p>
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
