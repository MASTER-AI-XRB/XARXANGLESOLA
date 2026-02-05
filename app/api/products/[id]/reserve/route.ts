import { NextRequest } from 'next/server'
import { getAuthUserId } from '@/lib/auth'
import { validateUuid } from '@/lib/validation'
import { apiError, apiOk } from '@/lib/api-response'
import { logError, logInfo, logWarn } from '@/lib/logger'
import { prisma } from '@/lib/prisma'
import { getSocketServerUrl } from '@/lib/socket'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
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
      const socketUrl = getSocketServerUrl()
      const actor = await prisma.user.findUnique({
        where: { id: authUserId },
        select: { nickname: true },
      })
      const reservedBy = actor ? { nickname: actor.nickname } : null

      if (socketUrl && notifySecret) {
        try {
          const broadcastRes = await fetch(`${socketUrl}/broadcast-product-state`, {
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
          if (!broadcastRes.ok) {
            logWarn('Broadcast product-state (reserve) fallit:', { status: broadcastRes.status, body: await broadcastRes.text().catch(() => '') })
          }
        } catch (err) {
          logWarn('Broadcast product-state (reserve) error:', err)
        }
      }

      if (notifySecret && socketUrl && product.name) {
        const actorNickname = actor?.nickname ?? 'Algú'
        const productName = product.name
        const productId = resolvedParams.id
        try {
          const favorites = await prisma.favorite.findMany({
            where: {
              productId: resolvedParams.id,
              userId: { not: authUserId },
            },
            select: { userId: true },
          })
          if (favorites.length === 0) {
            logInfo('Notificacions reserva: cap usuari amb el producte als preferits (excepte qui reserva); no s\'envia cap notificació.')
          } else {
            logInfo(`Notificacions reserva: enviant a ${favorites.length} usuari(s) amb el producte als preferits.`)
            await Promise.all(
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
                    titleKey: 'notifications.productReserved',
                    messageKey: 'notifications.productReservedFromFavoritesMessage',
                    params: { nickname: actorNickname, productName },
                    title: 'Producte reservat',
                    message: `${actorNickname} ha reservat un producte dels teus preferits: ${productName}`,
                    notificationType: 'reserved_favorite',
                    ownerReserve: true,
                    actorNickname,
                    productName,
                    action: { labelKey: 'notifications.viewProduct', label: 'Veure producte', url: `/app/products/${productId}` },
                  }),
                }).then(async (r) => {
                  if (r.ok || r.status === 404) return
                  const body = await r.text().catch(() => '')
                  const msg = r.status === 401
                    ? 'Revisa que AUTH_SECRET (o NOTIFY_SECRET) sigui el mateix a Vercel i Railway.'
                    : (() => {
                        try {
                          const d = JSON.parse(body) as { error?: string }
                          return (d?.error ?? body) || String(r.status)
                        } catch {
                          return body || String(r.status)
                        }
                      })()
                  logWarn('Notify reserva-preferits fallit:', { status: r.status, targetUserId: fav.userId, detail: msg })
                }).catch((err) => {
                  logWarn('Notify reserva-preferits error xarxa:', { targetUserId: fav.userId, error: String(err?.message || err) })
                })
              )
            )
          }
        } catch (e) {
          if (process.env.NODE_ENV === 'production') {
            logError('Error enviant notificacions reserva-preferits:', e)
          } else {
            logWarn('No s\'han pogut enviar notificacions reserva-preferits.', e)
          }
        }
      } else if (product.name && (!socketUrl || !notifySecret)) {
        logWarn('Notificacions reserva-preferits no enviades: cal NEXT_PUBLIC_SOCKET_URL i AUTH_SECRET (o NOTIFY_SECRET) a Vercel.')
        if (!socketUrl) logWarn('  → NEXT_PUBLIC_SOCKET_URL absent o buida.')
        if (!notifySecret) logWarn('  → AUTH_SECRET (i NOTIFY_SECRET) absents.')
      }

      return apiOk({ reserved: updated.reserved })
    }

    const mayUnreserve =
      product.reservedById === authUserId ||
      (product.reservedById == null && product.userId === authUserId)
    if (!mayUnreserve) {
      return apiError('Només qui ha sol·licitat la reserva pot finalitzar-la', 403)
    }
    const updated = await prisma.product.update({
      where: { id: resolvedParams.id },
      data: { reserved: false, reservedById: null },
    })

    const notifySecret = process.env.NOTIFY_SECRET || process.env.AUTH_SECRET
    const socketUrl = getSocketServerUrl()

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
            logWarn('Broadcast product-state (unreserve) fallit:', { status: r.status, body: await r.text().catch(() => '') })
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
                      titleKey: 'notifications.productUnreservedFromFavorites',
                      messageKey: 'notifications.productUnreservedFromFavoritesMessage',
                      params: { nickname, productName: product.name },
                      title: 'Finalitzada la reserva',
                      message: `${nickname} ha finalitzat la reserva d'un producte dels teus preferits: ${product.name}`,
                      notificationType: 'unreserved_favorite',
                      ownerReserve: true,
                      actorNickname: nickname,
                      productName: product.name,
                      action: { labelKey: 'notifications.viewProduct', label: 'Veure producte', url: `/app/products/${resolvedParams.id}` },
                    }),
                  })
                    .then(async (r) => {
                      if (r.ok || r.status === 404) return
                      const body = await r.text().catch(() => '')
                      const msg = r.status === 401
                        ? 'Revisa AUTH_SECRET/NOTIFY_SECRET (mateix a Vercel i Railway).'
                        : (() => {
                            try {
                              const d = JSON.parse(body) as { error?: string }
                              return (d?.error ?? body) || String(r.status)
                            } catch {
                              return body || String(r.status)
                            }
                          })()
                      logWarn('Notify desreserva-preferits fallit:', { status: r.status, targetUserId: fav.userId, detail: msg })
                    })
                    .catch((err) => {
                      logWarn('Notify desreserva-preferits error xarxa:', { targetUserId: fav.userId, error: String(err?.message || err) })
                    })
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
  }
}
