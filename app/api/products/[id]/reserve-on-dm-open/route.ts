import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthUserId } from '@/lib/auth'
import { validateUuid } from '@/lib/validation'
import { apiError, apiOk } from '@/lib/api-response'
import { logError, logInfo, logWarn } from '@/lib/logger'
import { getSocketServerUrl } from '@/lib/socket'

/**
 * Reserva el producte per l'usuari que obre el DM (primer que obre).
 * Idempotent: si ja està reservat, no es fa res.
 */
export async function POST(
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

    if (!authUserId) {
      return apiError('Usuari no autenticat', 401)
    }

    const product = await prisma.product.findUnique({
      where: { id: resolvedParams.id },
    })

    if (!product) {
      return apiError('Producte no trobat', 404)
    }

    if (product.userId === authUserId) {
      return apiOk({ reserved: product.reserved, alreadyReserved: true })
    }

    if (product.reserved) {
      return apiOk({ reserved: true, alreadyReserved: true })
    }

    // Actualització atòmica: només un request pot reservar (evita duplicats amb Strict Mode / doble crida)
    const updated = await prisma.product.updateMany({
      where: { id: resolvedParams.id, reserved: false },
      data: { reserved: true, reservedById: authUserId },
    })
    if (updated.count === 0) {
      return apiOk({ reserved: true, alreadyReserved: true })
    }

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
          logWarn('Broadcast product-state (reserve-on-dm-open) fallit:', { status: broadcastRes.status, body: await broadcastRes.text().catch(() => '') })
        }
      } catch (err) {
        logWarn('Broadcast product-state (reserve-on-dm-open) error:', err)
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
          logInfo('Notificacions reserva (DM): cap usuari amb el producte als preferits (excepte qui reserva).')
        } else {
          logInfo(`Notificacions reserva (DM): enviant a ${favorites.length} usuari(s) amb el producte als preferits.`)
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
                  actorNickname,
                  productName,
                  action: { labelKey: 'notifications.viewProduct', label: 'Veure producte', url: `/app/products/${productId}` },
                }),
              }).then(async (r) => {
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
                logWarn('Notify reserva-DM preferits fallit:', { status: r.status, targetUserId: fav.userId, detail: msg })
              }).catch((err) => {
                logWarn('Notify reserva-DM preferits error xarxa:', { targetUserId: fav.userId, error: String(err?.message || err) })
              })
            )
          )
        }
      } catch (e) {
        if (process.env.NODE_ENV === 'production') {
          logError('Error enviant notificacions reserva-DM preferits:', e)
        } else {
          logWarn('No s\'han pogut enviar notificacions reserva-DM preferits.', e)
        }
      }
    }

    return apiOk({ reserved: true, alreadyReserved: false })
  } catch (error) {
    logError('Error reservant producte (obertura DM):', error)
    return apiError('Error reservant producte', 500)
  }
}
