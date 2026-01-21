import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthUserId } from '@/lib/auth'
import { mapProduct } from '@/lib/product-map'
import { apiError, apiOk } from '@/lib/api-response'
import { logError } from '@/lib/logger'

// Forçar que aquesta ruta sigui dinàmica (no es pot pre-renderitzar)
export const dynamic = 'force-dynamic'

// Obtenir productes de l'usuari
export async function GET(request: NextRequest) {
  try {
    const authUserId = getAuthUserId(request)

    if (!authUserId) {
      return apiError('Usuari no autenticat', 401)
    }

    const products = await prisma.product.findMany({
      where: { userId: authUserId },
      include: {
        user: {
          select: {
            nickname: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    })

    const productsWithParsedImages = products.map(mapProduct)

    return apiOk(productsWithParsedImages)
  } catch (error) {
    logError('Error carregant productes de l\'usuari:', error)
    return apiError('Error carregant productes', 500)
  }
}

