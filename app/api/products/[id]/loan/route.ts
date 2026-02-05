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
    const { prestec } = await request.json()

    if (!authUserId) {
      return apiError('Usuari no autenticat', 401)
    }
    if (typeof prestec !== 'boolean') {
      return apiError('Valor de préstec no vàlid', 400)
    }

    // Comprovar que l'usuari és el propietari
    const product = await prisma.product.findUnique({
      where: { id: resolvedParams.id },
    })

    if (!product) {
      return apiError('Producte no trobat', 404)
    }

    if (product.userId !== authUserId) {
      return apiError('No tens permisos per modificar aquest producte', 403)
    }

    const updatedProduct = await prisma.product.update({
      where: { id: resolvedParams.id },
      data: { prestec: prestec },
    })

    const socketUrl = getSocketServerUrl()
    const notifySecret = process.env.NOTIFY_SECRET || process.env.AUTH_SECRET
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
            prestec: updatedProduct.prestec,
          }),
        })
        if (!broadcastRes.ok) {
          logWarn('Broadcast product-state (loan) fallit:', { status: broadcastRes.status, body: await broadcastRes.text().catch(() => '') })
        }
      } catch (err) {
        logWarn('Broadcast product-state (loan) error:', err)
      }
    }

    if (notifySecret && socketUrl && product.name) {
      const productName = product.name
      const productId = resolvedParams.id
      const isLoanStarted = updatedProduct.prestec
      const titleKey = isLoanStarted ? 'notifications.loanStarted' : 'notifications.loanEnded'
      const messageKey = isLoanStarted ? 'notifications.loanStartedMessage' : 'notifications.loanEndedMessage'
      const notificationType = isLoanStarted ? 'loan_started' : 'loan_ended'
      const titleLiteral = isLoanStarted ? 'Prèstec iniciat' : 'Prèstec acabat'
      const messageLiteral = isLoanStarted
        ? `Comença el prèstec de ${productName}`
        : `S'ha acabat el prèstec de ${productName}`
      try {
        const favorites = await prisma.favorite.findMany({
          where: {
            productId: resolvedParams.id,
            userId: { not: product.userId },
          },
          select: { userId: true },
        })
        if (favorites.length === 0) {
          logInfo('Notificacions prèstec: cap usuari amb el producte als preferits (excepte el propietari).')
        } else {
          logInfo('Notificacions prèstec:', isLoanStarted ? 'inici' : 'fi', '- enviant a', favorites.length, 'usuari(s).')
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
                  titleKey,
                  messageKey,
                  params: { productName },
                  title: titleLiteral,
                  message: messageLiteral,
                  notificationType,
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
                logWarn('Notify prèstec preferits fallit:', { status: r.status, targetUserId: fav.userId, detail: msg })
              }).catch((err) => {
                logWarn('Notify prèstec preferits error xarxa:', { targetUserId: fav.userId, error: String(err?.message || err) })
              })
            )
          )
        }
      } catch (e) {
        if (process.env.NODE_ENV === 'production') {
          logError('Error enviant notificacions prèstec preferits:', e)
        } else {
          logWarn('No s\'han pogut enviar notificacions prèstec preferits.', e)
        }
      }
    }

    return apiOk({ prestec: updatedProduct.prestec })
  } catch (error) {
    logError('Error actualitzant préstec:', error)
    return apiError('Error actualitzant préstec', 500)
  }
}
