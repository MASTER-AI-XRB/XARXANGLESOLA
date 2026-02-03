import { NextRequest } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { getAuthUserId } from '@/lib/auth'
import { validateUuid } from '@/lib/validation'
import { apiError, apiOk } from '@/lib/api-response'
import { logError, logWarn } from '@/lib/logger'

function getPrisma() {
  try {
    return new PrismaClient({
      log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
    })
  } catch (error) {
    logError('Error creant PrismaClient:', error)
    throw error
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  const prisma = getPrisma()
  try {
    const resolvedParams = params instanceof Promise ? await params : params
    const idValidation = validateUuid(resolvedParams.id, 'producte')
    if (!idValidation.valid) {
      return apiError(idValidation.error || 'Producte no vàlid', 400)
    }
    const authUserId = getAuthUserId(request)
    const body = await request.json().catch(() => ({}))
    const reserved = body.reserved

    if (!authUserId) {
      return apiError('Usuari no autenticat', 401)
    }
    if (typeof reserved !== 'boolean') {
      return apiError('Valor de reserva no vàlid', 400)
    }

    const product = await prisma.product.findUnique({
      where: { id: resolvedParams.id },
      select: { id: true, userId: true, name: true, reserved: true, reservedById: true },
    })

    if (!product) {
      return apiError('Producte no trobat', 404)
    }

    if (reserved) {
      if (product.userId !== authUserId) {
        return apiError('No tens permisos per reservar aquest producte', 403)
      }
      if (product.reserved) {
        return apiError('El producte ja està reservat', 409)
      }
      const updated = await prisma.product.update({
        where: { id: resolvedParams.id },
        data: { reserved: true, reservedById: authUserId },
      })

      const notifySecret = process.env.NOTIFY_SECRET || process.env.AUTH_SECRET
      const socketUrl = (process.env.NEXT_PUBLIC_SOCKET_URL || '').trim()

      if (notifySecret && socketUrl && product.name) {
        try {
          const [actor, favorites] = await Promise.all([
            prisma.user.findUnique({
              where: { id: authUserId },
              select: { nickname: true },
            }),
            prisma.favorite.findMany({
              where: {
                productId: resolvedParams.id,
                userId: { not: authUserId },
              },
              select: { userId: true },
            }),
          ])
          const actorNickname = actor?.nickname ?? 'Algú'
          const productName = product.name
          const productId = resolvedParams.id
          const title = 'Producte reservat'
          const message = `${actorNickname} ha reservat un producte dels teus preferits: ${productName}`
          const action = {
            label: 'Veure producte',
            url: `/app/products/${productId}`,
          }

          await Promise.all(
            favorites.map((fav) =>
              fetch(`${socketUrl.replace(/\/$/, '')}/notify`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'x-notify-token': notifySecret,
                },
                body: JSON.stringify({
                  targetUserId: fav.userId,
                  type: 'info',
                  title,
                  message,
                  notificationType: 'reserved_favorite',
                  actorNickname,
                  productName,
                  action,
                }),
              })
                .then(async (r) => {
                  if (r.ok || r.status === 404) return
                  const d = await r.json().catch(() => ({}))
                  logWarn('Notify reserva-preferits:', (d as { error?: string })?.error ?? r.status)
                })
                .catch(() => {})
            )
          )
        } catch (e) {
          if (process.env.NODE_ENV === 'production') {
            logError('Error enviant notificacions reserva-preferits:', e)
          } else {
            logWarn('No s\'han pogut enviar notificacions reserva-preferits.', e)
          }
        }
      }

      return apiOk({ reserved: updated.reserved })
    }

    const mayUnreserve =
      product.reservedById === authUserId ||
      (product.reservedById == null && product.userId === authUserId)
    if (!mayUnreserve) {
      return apiError('Només qui ha sol·licitat la reserva pot desreservar', 403)
    }
    const updated = await prisma.product.update({
      where: { id: resolvedParams.id },
      data: { reserved: false, reservedById: null },
    })

    const notifySecret = process.env.NOTIFY_SECRET || process.env.AUTH_SECRET
    const socketUrl = (process.env.NEXT_PUBLIC_SOCKET_URL || '').trim()

    if (notifySecret && socketUrl && product.name) {
      try {
        const [actor, favorites] = await Promise.all([
          prisma.user.findUnique({
            where: { id: authUserId },
            select: { nickname: true },
          }),
          prisma.favorite.findMany({
            where: {
              productId: resolvedParams.id,
              userId: { not: authUserId },
            },
            select: { userId: true },
          }),
        ])
        const nickname = actor?.nickname ?? 'Algú'
        const productName = product.name
        const productId = resolvedParams.id
        const title = 'Producte desreservat'
        const message = `${nickname} ha desreservat un producte dels teus preferits: ${productName}`
        const action = {
          label: 'Veure producte',
          url: `/app/products/${productId}`,
        }

        await Promise.all(
          favorites.map((fav) =>
            fetch(`${socketUrl.replace(/\/$/, '')}/notify`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'x-notify-token': notifySecret,
              },
              body: JSON.stringify({
                targetUserId: fav.userId,
                type: 'info',
                title,
                message,
                notificationType: 'unreserved_favorite',
                actorNickname: nickname,
                productName,
                action,
              }),
            })
              .then(async (r) => {
                if (r.ok || r.status === 404) return
                const d = await r.json().catch(() => ({}))
                logWarn('Notify desreserva-preferits:', (d as { error?: string })?.error ?? r.status)
              })
              .catch(() => {})
          )
        )
      } catch (e) {
        if (process.env.NODE_ENV === 'production') {
          logError('Error enviant notificacions desreserva-preferits:', e)
        } else {
          logWarn('No s\'han pogut enviar notificacions desreserva-preferits.', e)
        }
      }
    }

    return apiOk({ reserved: updated.reserved })
  } catch (error) {
    logError('Error actualitzant reserva:', error)
    return apiError('Error actualitzant reserva', 500)
  } finally {
    await prisma.$disconnect()
  }
}
