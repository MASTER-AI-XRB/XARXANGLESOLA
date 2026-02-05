import { NextRequest } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { getAuthUserId } from '@/lib/auth'
import { mapProduct } from '@/lib/product-map'
import { validateUuid } from '@/lib/validation'
import { apiError, apiOk } from '@/lib/api-response'
import { logError, logWarn } from '@/lib/logger'
import { getSocketServerUrl } from '@/lib/socket'

// Funció helper per obtenir instància de Prisma
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

// Obtenir tots els preferits de l'usuari
export async function GET(request: NextRequest) {
  const prisma = getPrisma()
  try {
    const userId = getAuthUserId(request)

    if (!userId) {
      return apiError('Usuari no autenticat', 401)
    }

    const favorites = await prisma.favorite.findMany({
      where: { userId },
      include: {
        product: {
          include: {
            user: { select: { nickname: true } },
            reservedBy: { select: { nickname: true } },
            _count: { select: { favorites: true } },
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    })

    const products = favorites.map((fav) => mapProduct(fav.product))

    return apiOk(products)
  } catch (error) {
    logError('Error carregant preferits:', error)
    return apiError('Error carregant preferits', 500)
  } finally {
    await prisma.$disconnect()
  }
}

// Afegir producte als preferits
export async function POST(request: NextRequest) {
  const prisma = getPrisma()
  try {
    const { productId } = await request.json()
    const authUserId = getAuthUserId(request)

    if (!authUserId) {
      return apiError('Usuari no autenticat', 401)
    }
    if (!productId) {
      return apiError('Falten dades necessàries', 400)
    }
    const productIdValidation = validateUuid(productId, 'producte')
    if (!productIdValidation.valid) {
      return apiError(productIdValidation.error || 'Producte no vàlid', 400)
    }

    // Comprovar si ja existeix
    const existing = await prisma.favorite.findUnique({
      where: {
        userId_productId: {
          userId: authUserId,
          productId,
        },
      },
    })

    if (existing) {
      return apiOk({ isFavorite: true })
    }
    
    // Obtenir informació del producte i del propietari
    const product = await prisma.product.findUnique({
      where: { id: productId },
      include: {
        user: {
          select: {
            id: true,
            nickname: true,
          },
        },
      },
    })

    if (!product) {
      return apiError('Producte no trobat', 404)
    }

    await prisma.favorite.create({
      data: {
        userId: authUserId,
        productId,
      },
      include: {
        product: true,
      },
    })

    // Enviar notificació al propietari del producte si no és el mateix usuari
    const notificationsEnabled =
      process.env.NODE_ENV === 'production' ||
      process.env.ENABLE_DEV_NOTIFICATIONS === 'true'
    const notifySecret = process.env.NOTIFY_SECRET || process.env.AUTH_SECRET
    if (product.userId !== authUserId && notificationsEnabled) {
      try {
        const socketUrl = getSocketServerUrl()
        if (!socketUrl || !notifySecret) {
          return apiOk({ isFavorite: true })
        }
        const user = await prisma.user.findUnique({
          where: { id: authUserId },
          select: { nickname: true },
        })

        await fetch(`${socketUrl}/notify`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-notify-token': notifySecret,
          },
          body: JSON.stringify({
            targetUserId: product.userId,
            type: 'info',
            titleKey: 'notifications.productAddedToFavorites',
            messageKey: 'notifications.productAddedToFavoritesMessage',
            params: { nickname: user?.nickname || 'Algú', productName: product.name },
            title: 'Producte afegit als preferits',
            message: `${user?.nickname || 'Algú'} ha afegit el teu producte als preferits: ${product.name}`,
            notificationType: 'favorite',
            actorNickname: user?.nickname || '',
            productName: product.name,
            action: {
              labelKey: 'notifications.viewProduct',
              label: 'Veure producte',
              url: `/app/products/${productId}`,
            },
          }),
        })
      } catch (error) {
        if (process.env.NODE_ENV === 'production') {
          logError('Error enviant notificació:', error)
        } else {
          logWarn('No s\'ha pogut enviar la notificació de preferits.', error)
        }
        // No fallar la petició si la notificació falla
      }
    }

    return apiOk({ isFavorite: true })
  } catch (error) {
    logError('Error afegint preferit:', error)
    return apiError('Error afegint preferit', 500, {
      details: error instanceof Error ? error.message : 'Unknown error',
    })
  } finally {
    await prisma.$disconnect()
  }
}

// Eliminar producte dels preferits
export async function DELETE(request: NextRequest) {
  const prisma = getPrisma()
  try {
    const { productId } = await request.json()
    const authUserId = getAuthUserId(request)

    if (!authUserId) {
      return apiError('Usuari no autenticat', 401)
    }
    if (!productId) {
      return apiError('Falten dades necessàries', 400)
    }
    const productIdValidation = validateUuid(productId, 'producte')
    if (!productIdValidation.valid) {
      return apiError(productIdValidation.error || 'Producte no vàlid', 400)
    }

    await prisma.favorite.delete({
      where: {
        userId_productId: {
          userId: authUserId,
          productId,
        },
      },
    })

    return apiOk({ isFavorite: false })
  } catch (error) {
    logError('Error eliminant preferit:', error)
    return apiError('Error eliminant preferit', 500)
  } finally {
    await prisma.$disconnect()
  }
}

