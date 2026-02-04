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
      const socketUrl = (process.env.NEXT_PUBLIC_SOCKET_URL || '').trim().replace(/\/$/, '')
      const actor = await prisma.user.findUnique({
        where: { id: authUserId },
        select: { nickname: true },
      })
      const reservedBy = actor ? { nickname: actor.nickname } : null

      if (socketUrl && notifySecret) {
        fetch(`${socketUrl}/broadcast-product-state`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-notify-token': notifySecret,
          },
          body: JSON.stringify({
            productId: resolvedParams.id,
            reserved: true,
            reservedBy,
          }),
        })
          .then(async (r) => {
            if (!r.ok) {
              logWarn('Broadcast product-state (reserve) fallit:', r.status, await r.text().catch(() => ''))
            }
          })
          .catch((err) => {
            logWarn('Broadcast product-state (reserve) error:', err)
          })
      }

      if (notifySecret && socketUrl && product.name) {
        const actorNickname = actor?.nickname ?? 'Algú'
        const productName = product.name
        const productId = resolvedParams.id
        prisma.favorite
          .findMany({
            where: {
              productId: resolvedParams.id,
              userId: { not: authUserId },
            },
            select: { userId: true },
          })
          .then((favorites) =>
            Promise.all(
              favorites.map((fav) =>
                fetch(`${socketUrl}/notify`, {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                    'x-notify-token': notifySecret,
                  },
                  body: JSON.stringify({
                    targetUserId: fav.userId,
                    type: 'info',
                    title: 'Producte reservat',
                    message: `${actorNickname} ha reservat un producte dels teus preferits: ${productName}`,
                    notificationType: 'reserved_favorite',
                    actorNickname,
                    productName,
                    action: { label: 'Veure producte', url: `/app/products/${productId}` },
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
          )
          .catch((e) => {
            if (process.env.NODE_ENV === 'production') {
              logError('Error enviant notificacions reserva-preferits:', e)
            } else {
              logWarn('No s\'han pogut enviar notificacions reserva-preferits.', e)
            }
          })
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
    const socketUrl = (process.env.NEXT_PUBLIC_SOCKET_URL || '').trim().replace(/\/$/, '')

    if (socketUrl && notifySecret) {
      fetch(`${socketUrl}/broadcast-product-state`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-notify-token': notifySecret,
        },
        body: JSON.stringify({
          productId: resolvedParams.id,
          reserved: false,
          reservedBy: null,
        }),
      })
        .then(async (r) => {
          if (!r.ok) {
            logWarn('Broadcast product-state (unreserve) fallit:', r.status, await r.text().catch(() => ''))
          }
        })
        .catch((err) => {
          logWarn('Broadcast product-state (unreserve) error:', err)
        })
    }

    if (notifySecret && socketUrl && product.name) {
      prisma.user
        .findUnique({
          where: { id: authUserId },
          select: { nickname: true },
        })
        .then((actor) => {
          const nickname = actor?.nickname ?? 'Algú'
          return prisma.favorite
            .findMany({
              where: {
                productId: resolvedParams.id,
                userId: { not: authUserId },
              },
              select: { userId: true },
            })
            .then((favorites) =>
              Promise.all(
                favorites.map((fav) =>
                  fetch(`${socketUrl}/notify`, {
                    method: 'POST',
                    headers: {
                      'Content-Type': 'application/json',
                      'x-notify-token': notifySecret,
                    },
                    body: JSON.stringify({
                      targetUserId: fav.userId,
                      type: 'info',
                      title: 'Producte desreservat',
                      message: `${nickname} ha desreservat un producte dels teus preferits: ${product.name}`,
                      notificationType: 'unreserved_favorite',
                      actorNickname: nickname,
                      productName: product.name,
                      action: { label: 'Veure producte', url: `/app/products/${resolvedParams.id}` },
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
            )
        })
        .catch((e) => {
          if (process.env.NODE_ENV === 'production') {
            logError('Error enviant notificacions desreserva-preferits:', e)
          } else {
            logWarn('No s\'han pogut enviar notificacions desreserva-preferits.', e)
          }
        })
    }

    return apiOk({ reserved: updated.reserved })
  } catch (error) {
    logError('Error actualitzant reserva:', error)
    return apiError('Error actualitzant reserva', 500)
  } finally {
    await prisma.$disconnect()
  }
}
