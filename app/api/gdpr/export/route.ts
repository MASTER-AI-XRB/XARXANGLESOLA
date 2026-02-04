import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthUserId } from '@/lib/auth'
import { apiError, apiOk } from '@/lib/api-response'
import { logError } from '@/lib/logger'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const userId = getAuthUserId(request)

    if (!userId) {
      return apiError('Usuari no autenticat', 401)
    }

    // Obtenir totes les dades de l'usuari
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        products: {
          include: {
            favorites: true,
          },
        },
        messages: true,
        favorites: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
        notificationPreference: true,
        accounts: {
          select: {
            provider: true,
            type: true,
          },
        },
      },
    })

    if (!user) {
      return apiError('Usuari no trobat', 404)
    }

    // Preparar dades per exportar (sense informació sensible)
    const exportData = {
      user: {
        id: user.id,
        nickname: user.nickname,
        email: user.email,
        name: user.name,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
        lastLoginAt: user.lastLoginAt,
      },
      products: user.products.map((product) => ({
        id: product.id,
        name: product.name,
        description: product.description,
        images: product.images,
        reserved: product.reserved,
        prestec: product.prestec,
        createdAt: product.createdAt,
        updatedAt: product.updatedAt,
      })),
      messages: user.messages.map((message) => ({
        id: message.id,
        content: message.content,
        roomId: message.roomId,
        isPrivate: message.isPrivate,
        productId: message.productId,
        createdAt: message.createdAt,
      })),
      favorites: user.favorites.map((favorite) => ({
        id: favorite.id,
        productId: favorite.productId,
        productName: favorite.product.name,
        createdAt: favorite.createdAt,
      })),
      notificationPreferences: user.notificationPreference
        ? {
            receiveAll: user.notificationPreference.receiveAll,
            allowedNicknames: user.notificationPreference.allowedNicknames,
            allowedProductKeywords: user.notificationPreference.allowedProductKeywords,
            enabledTypes: user.notificationPreference.enabledTypes,
            createdAt: user.notificationPreference.createdAt,
            updatedAt: user.notificationPreference.updatedAt,
          }
        : null,
      linkedAccounts: user.accounts.map((account) => ({
        provider: account.provider,
        type: account.type,
      })),
      exportDate: new Date().toISOString(),
    }

    // Retornar com a JSON descarregable
    return new Response(JSON.stringify(exportData, null, 2), {
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="xarxa-anglesola-dades-${user.nickname || user.id}-${Date.now()}.json"`,
      },
    })
  } catch (error) {
    logError('Error exportant dades GDPR:', error)
    return apiError('Error en exportar les dades', 500)
  }
}
