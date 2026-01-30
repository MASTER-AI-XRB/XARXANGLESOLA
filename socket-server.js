/**
 * Servidor Socket.IO independent per desplegar a Railway/Render/Fly.io
 * Aquest servidor només gestiona les connexions Socket.IO
 */

const { createServer } = require('http')
const { Server } = require('socket.io')
const { PrismaClient } = require('@prisma/client')
const webPush = require('web-push')
const crypto = require('crypto')

const port = process.env.PORT || 3001
const prisma = new PrismaClient()
const dev = process.env.NODE_ENV !== 'production'

const getSecret = () => {
  const s = process.env.AUTH_SECRET
  if (s) return s
  return dev ? 'dev-secret-change-me' : null
}
const base64UrlDecode = (v) => {
  const p = v.replace(/-/g, '+').replace(/_/g, '/')
  const pad = (4 - (p.length % 4)) % 4
  return Buffer.from(p + '='.repeat(pad), 'base64').toString('utf8')
}
const sign = (payload, secret) =>
  crypto.createHmac('sha256', secret).update(payload).digest('base64url')
const verifySessionToken = (token) => {
  const secret = getSecret()
  if (!secret || !token) return null
  const [encoded, sig] = token.split('.')
  if (!encoded || !sig) return null
  const expected = sign(encoded, secret)
  try {
    if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null
  } catch {
    return null
  }
  const payload = JSON.parse(base64UrlDecode(encoded))
  if (!payload?.userId || !payload.exp || payload.exp < Math.floor(Date.now() / 1000)) return null
  return payload
}

const vapidPublic = process.env.VAPID_PUBLIC_KEY?.trim()
const vapidPrivate = process.env.VAPID_PRIVATE_KEY?.trim()
if (vapidPublic && vapidPrivate) {
  webPush.setVapidDetails(
    process.env.VAPID_MAILTO || 'mailto:noreply@xarxanglesola.local',
    vapidPublic,
    vapidPrivate
  )
}

const parseJsonArray = (value) => {
  if (!value) return []
  try {
    const parsed = JSON.parse(value)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

const shouldSendNotification = async (targetUserId, payload) => {
  const preference = await prisma.notificationPreference.findUnique({
    where: { userId: targetUserId },
  })
  if (!preference) return true

  const enabledTypes = parseJsonArray(preference.enabledTypes)
  if (payload.notificationType && enabledTypes.length > 0) {
    const normalized = enabledTypes.map((t) => String(t).toLowerCase())
    if (!normalized.includes(String(payload.notificationType).toLowerCase())) return false
  }
  if (preference.receiveAll) return true

  const allowedNicknames = parseJsonArray(preference.allowedNicknames)
    .map((n) => String(n).toLowerCase())
    .filter(Boolean)
  const allowedKeywords = parseJsonArray(preference.allowedProductKeywords)
    .map((k) => String(k).toLowerCase())
    .filter(Boolean)
  const actorNickname = String(payload.actorNickname || '').toLowerCase()
  const productName = String(payload.productName || payload.productType || '').toLowerCase()
  const matchesNickname = actorNickname && allowedNicknames.includes(actorNickname)
  const matchesKeyword = productName && allowedKeywords.some((k) => productName.includes(k))
  return matchesNickname || matchesKeyword
}

const normalizeString = (value, maxLength) => {
  if (typeof value !== 'string') return ''
  return value.trim().slice(0, maxLength)
}

const isUuid = (value) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value || ''
  )

const isNickname = (value) => /^[a-zA-Z0-9_-]{3,20}$/.test(value || '')

const buildPrivateRoomId = (userId, targetUserId, productId) => {
  const baseRoom = [userId, targetUserId].sort().join('-')
  return productId ? `${baseRoom}::${productId}` : baseRoom
}

const resolvePrivateTarget = async (payload) => {
  if (!payload) return null

  let targetIdentifier = payload
  let productId = null

  if (typeof payload === 'object') {
    targetIdentifier =
      payload.targetIdentifier || payload.targetNickname || payload.targetUserId || ''
    productId = payload.productId || null
  }

  if (typeof targetIdentifier !== 'string') return null
  const normalizedTarget = normalizeString(targetIdentifier, 50)
  if (!normalizedTarget) return null

  let targetUserId = normalizedTarget
  if (!isUuid(normalizedTarget)) {
    if (!isNickname(normalizedTarget)) return null
    const targetUser = await prisma.user.findUnique({
      where: { nickname: normalizedTarget },
      select: { id: true },
    })
    if (!targetUser) return null
    targetUserId = targetUser.id
  }

  if (productId) {
    if (!isUuid(productId)) return null
    const product = await prisma.product.findFirst({
      where: { id: productId, userId: targetUserId },
      select: { id: true },
    })
    if (!product) return null
  }

  return { targetUserId, productId: productId || null }
}

// Configurar orígens permesos per CORS
const getAllowedOrigins = () => {
  if (process.env.NEXT_PUBLIC_ALLOWED_ORIGINS) {
    return process.env.NEXT_PUBLIC_ALLOWED_ORIGINS.split(',').map(origin => origin.trim())
  }
  // En producció, permetre qualsevol origen si no està especificat (per desenvolupament)
  return process.env.NODE_ENV === 'production' ? [] : '*'
}

const httpServer = createServer()

const io = new Server(httpServer, {
  path: '/socket.io/',
  cors: {
    origin: (origin, callback) => {
      const allowedOrigins = getAllowedOrigins()
      
      // Permetre connexions sense origin
      if (!origin) {
        console.log('✅ Connexió sense origin (permesa)')
        callback(null, true)
        return
      }
      
      // Si és '*', permetre tot
      if (allowedOrigins === '*' || allowedOrigins.includes('*')) {
        callback(null, true)
        return
      }
      
      // Comprovar si l'origen està permès
      if (allowedOrigins.includes(origin)) {
        console.log(`✅ Origen permès: ${origin}`)
        callback(null, true)
      } else {
        console.warn(`⚠️ CORS: origen no permès: ${origin}`)
        console.log('📋 Orígens permesos:', allowedOrigins)
        callback(new Error('Not allowed by CORS'))
      }
    },
    methods: ['GET', 'POST', 'OPTIONS'],
    credentials: true,
    allowedHeaders: ['Content-Type', 'Authorization'],
  },
  transports: ['polling', 'websocket'],
  pingTimeout: 60000,
  pingInterval: 25000,
  connectTimeout: 20000,
})

// Estructures de dades per gestionar usuaris
const userSockets = new Map() // userId -> socketId
const socketUsers = new Map() // socketId -> { userId, nickname }
const userInfo = new Map() // userId -> { nickname }

io.on('connection', (socket) => {
  const token = socket.handshake.auth?.token || socket.handshake.query?.token
  const payload = token ? verifySessionToken(token) : null
  let userId = payload?.userId
  let nickname = payload?.nickname ?? null
  if (!userId || !nickname) {
    const q = socket.handshake.query || {}
    userId = userId || (typeof q.userId === 'string' ? q.userId : null)
    nickname = nickname || (typeof q.nickname === 'string' ? q.nickname : null)
  }

  console.log('=== NOVA CONNEXIÓ SOCKET.IO ===')
  console.log(`Origin: ${socket.handshake.headers.origin || 'sense origin'}`)
  console.log(`Socket ID: ${socket.id}`)
  console.log(`UserId: ${userId}`)
  console.log(`Nickname: ${nickname}`)
  console.log('================================')

  if (!userId || !nickname) {
    console.warn('Connexió rebutjada: falten userId o nickname (token invàlid o no enviat)')
    socket.disconnect(true)
    return
  }

  // Comprovar si l'usuari ja està connectat
  if (userSockets.has(userId)) {
    const existingSocketId = userSockets.get(userId)
    console.log(`Usuari ${nickname} (${userId}) ja està connectat. Desconnectant sessió anterior...`)
    
    const existingSocket = io.sockets.sockets.get(existingSocketId)
    if (existingSocket) {
      existingSocket.emit('session-terminated', { 
        message: 'Una nova sessió s\'ha obert des d\'un altre dispositiu' 
      })
      existingSocket.disconnect(true)
    }
    
    socketUsers.delete(existingSocketId)
  }

  console.log(`Usuari connectat: ${nickname} (${userId}) - Socket: ${socket.id}`)

  // Registrar la nova sessió
  userSockets.set(userId, socket.id)
  socketUsers.set(socket.id, { userId, nickname })
  userInfo.set(userId, { nickname })

  // Notificar nous usuaris en línia
  updateOnlineUsers()

  // Unir-se al xat general
  socket.on('join-general', async () => {
    socket.join('general')
    try {
      const messages = await prisma.message.findMany({
        where: {
          roomId: 'general',
          isPrivate: false,
        },
        include: {
          user: {
            select: {
              nickname: true,
            },
          },
        },
        orderBy: {
          createdAt: 'asc',
        },
        take: 50,
      })
      socket.emit('load-messages', messages.map((m) => ({
        ...m,
        userNickname: m.user.nickname,
      })))
    } catch (error) {
      console.error('Error carregant missatges generals:', error)
    }
  })

  // Missatge general
  socket.on('general-message', async (data) => {
    const user = socketUsers.get(socket.id)
    if (!user) return

    // Validar contingut del missatge
    if (!data.content || typeof data.content !== 'string') return
    const content = data.content.trim()
    if (content.length === 0 || content.length > 1000) return

    try {
      const message = await prisma.message.create({
        data: {
          content: content,
          userId: user.userId,
          roomId: 'general',
          isPrivate: false,
        },
        include: {
          user: {
            select: {
              nickname: true,
            },
          },
        },
      })

      io.to('general').emit('general-message', {
        ...message,
        userNickname: message.user.nickname,
      })
    } catch (error) {
      console.error('Error creant missatge general:', error)
    }
  })

  // Unir-se a xat privat (accepta nickname o userId)
  socket.on('join-private', async (payload) => {
    const user = socketUsers.get(socket.id)
    if (!user) return

    try {
      const resolved = await resolvePrivateTarget(payload)
      if (!resolved) return

      const roomId = buildPrivateRoomId(
        user.userId,
        resolved.targetUserId,
        resolved.productId
      )
      socket.join(roomId)
    } catch (error) {
      console.error('Error unint-se a xat privat:', error)
    }
  })

  // Carregar missatges privats (accepta nickname o userId)
  socket.on('load-private-messages', async (payload) => {
    const user = socketUsers.get(socket.id)
    if (!user) return

    try {
      const resolved = await resolvePrivateTarget(payload)
      if (!resolved) return

      const roomId = buildPrivateRoomId(
        user.userId,
        resolved.targetUserId,
        resolved.productId
      )
      const messages = await prisma.message.findMany({
        where: {
          OR: [
            { roomId: roomId, userId: user.userId },
            { roomId: roomId, userId: resolved.targetUserId },
          ],
          isPrivate: true,
          productId: resolved.productId,
        },
        include: {
          user: {
            select: {
              nickname: true,
            },
          },
        },
        orderBy: {
          createdAt: 'asc',
        },
      })

      socket.emit('load-private-messages', {
        userId: resolved.targetUserId,
        productId: resolved.productId,
        messages: messages.map((m) => ({
          ...m,
          userNickname: m.user.nickname,
          productId: m.productId || null,
        })),
      })
    } catch (error) {
      console.error('Error carregant missatges privats:', error)
    }
  })

  // Missatge privat (accepta nickname o userId)
  socket.on('private-message', async (data) => {
    const user = socketUsers.get(socket.id)
    if (!user) return

    // Validar contingut del missatge
    if (!data.content || typeof data.content !== 'string') return
    const content = data.content.trim()
    if (content.length === 0 || content.length > 1000) return

    try {
      const resolved = await resolvePrivateTarget(data)
      if (!resolved) return

      const roomId = buildPrivateRoomId(
        user.userId,
        resolved.targetUserId,
        resolved.productId
      )
      const targetSocketId = userSockets.get(resolved.targetUserId)

      const message = await prisma.message.create({
        data: {
          content: content,
          userId: user.userId,
          roomId: roomId,
          isPrivate: true,
          productId: resolved.productId,
        },
        include: {
          user: {
            select: {
              nickname: true,
            },
          },
        },
      })

      const messageData = {
        ...message,
        userNickname: message.user.nickname,
        productId: message.productId || null,
      }

      // Enviar al remitent
      socket.emit('private-message', messageData)

      // Enviar al destinatari si està connectat
      if (targetSocketId) {
        io.to(targetSocketId).emit('private-message', messageData)
      }
    } catch (error) {
      console.error('Error enviant missatge privat:', error)
    }
  })

  // Desconnexió
  socket.on('disconnect', () => {
    console.log(`Usuari desconnectat: ${nickname} (${userId}) - Socket: ${socket.id}`)
    
    // Només eliminar si aquest socket és el que està registrat per a l'usuari
    if (userSockets.get(userId) === socket.id) {
      userSockets.delete(userId)
      userInfo.delete(userId)
    }
    
    socketUsers.delete(socket.id)
    updateOnlineUsers()
  })

  function updateOnlineUsers() {
    const onlineUsers = Array.from(userInfo.values()).map(
      (u) => u.nickname
    )
    io.emit('online-users', onlineUsers)
  }
})

  // Event per notificar quan algú afegeix un producte als preferits
  // Aquest event s'emet des de les API routes via HTTP request al servidor Socket.IO
  io.on('notification', (data) => {
    const { targetUserId, type, title, message, action } = data
    const targetSocketId = userSockets.get(targetUserId)
    if (targetSocketId) {
      io.to(targetSocketId).emit('app-notification', {
        type,
        title,
        message,
        action,
      })
    }
  })

  // Log de connexions fallides
  io.engine.on('connection_error', (err) => {
    console.error('=== ERROR DE CONNEXIÓ SOCKET.IO ===')
    console.error('Error:', err.message)
    console.error('Context:', err.context)
    console.error('===================================')
  })

  // Endpoint HTTP per enviar notificacions des de les API routes
  httpServer.on('request', (req, res) => {
    if (req.url && req.url.startsWith('/socket.io')) return

    res.setHeader('Access-Control-Allow-Origin', '*')
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-notify-token')

    if (req.method === 'OPTIONS') {
      res.writeHead(200)
      res.end()
      return
    }

    if (req.method !== 'POST' || req.url !== '/notify') {
      res.writeHead(404)
      res.end('Not found')
      return
    }

    const notifySecret = process.env.NOTIFY_SECRET || process.env.AUTH_SECRET
    if (notifySecret) {
      const requestToken = req.headers['x-notify-token']
      if (requestToken !== notifySecret) {
        res.writeHead(401, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ success: false, error: 'Unauthorized' }))
        return
      }
    }

    let body = ''
    req.on('data', (chunk) => { body += chunk.toString() })
    req.on('end', async () => {
      try {
        const data = JSON.parse(body || '{}')
        const {
          targetUserId,
          type,
          title,
          message,
          action,
          notificationType,
          actorNickname,
          productName,
          productType,
        } = data

        if (!targetUserId) {
          res.writeHead(400, { 'Content-Type': 'application/json' })
          res.end(JSON.stringify({ success: false, error: 'Missing targetUserId' }))
          return
        }

        const shouldSend = await shouldSendNotification(targetUserId, {
          notificationType,
          actorNickname,
          productName,
          productType,
        })
        if (!shouldSend) {
          res.writeHead(200, { 'Content-Type': 'application/json' })
          res.end(JSON.stringify({ success: true, skipped: true }))
          return
        }

        const targetSocketId = userSockets.get(targetUserId)
        if (targetSocketId) {
          io.to(targetSocketId).emit('app-notification', { type, title, message, action })
          res.writeHead(200, { 'Content-Type': 'application/json' })
          res.end(JSON.stringify({ success: true }))
          return
        }

        const baseUrl = (process.env.NEXT_PUBLIC_APP_URL || '').trim() || (dev ? `http://localhost:3000` : '')
        const rawUrl = action?.url || '/app'
        const pushUrl = rawUrl.startsWith('http')
          ? rawUrl
          : (baseUrl ? baseUrl + (rawUrl.startsWith('/') ? rawUrl : '/' + rawUrl) : rawUrl)
        const pushPayload = JSON.stringify({
          title: title || 'Xarxa Anglesola',
          body: message || '',
          url: pushUrl,
          tag: 'xarxa-push-' + Date.now(),
        })

        const subs = await prisma.pushSubscription.findMany({
          where: { userId: targetUserId },
          select: { id: true, endpoint: true, p256dh: true, auth: true },
        })

        if (vapidPublic && vapidPrivate && subs.length > 0) {
          await Promise.all(
            subs.map((s) => {
              const sub = { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }
              return webPush.sendNotification(sub, pushPayload).catch(async (err) => {
                const status = err?.statusCode ?? err?.status
                if (status === 410 || status === 404) {
                  try {
                    await prisma.pushSubscription.delete({ where: { id: s.id } })
                  } catch (_) {}
                }
              })
            })
          )
        }

        res.writeHead(200, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ success: true }))
      } catch (err) {
        res.writeHead(400, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ success: false, error: 'Invalid JSON' }))
      }
    })
  })

httpServer.listen(port, () => {
  console.log(`🚀 Socket.IO servidor corrent al port ${port}`)
  console.log(`📡 Orígens permesos:`, getAllowedOrigins())
  console.log(`🔗 URL: http://localhost:${port}`)
})

// Gestió d'errors no capturats
process.on('unhandledRejection', (error) => {
  console.error('Unhandled Rejection:', error)
})

process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error)
  process.exit(1)
})
