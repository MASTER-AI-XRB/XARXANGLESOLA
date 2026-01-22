import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthUserId } from '@/lib/auth'
import { validateUuid } from '@/lib/validation'
import { apiOk } from '@/lib/api-response'
import { logError } from '@/lib/logger'

// Forçar que aquesta ruta sigui dinàmica (no es pot pre-renderitzar)
export const dynamic = 'force-dynamic'

// Comprovar si un producte està als preferits de l'usuari
export async function GET(request: NextRequest) {
  try {
    const authUserId = getAuthUserId(request)
    const productId = new URL(request.url).searchParams.get('productId')

    if (!authUserId || !productId) {
      return apiOk({ isFavorite: false })
    }
    const productIdValidation = validateUuid(productId, 'producte')
    if (!productIdValidation.valid) {
      return apiOk({ isFavorite: false })
    }

    const favorite = await prisma.favorite.findUnique({
      where: {
        userId_productId: {
          userId: authUserId,
          productId,
        },
      },
    })

    return apiOk({ isFavorite: !!favorite })
  } catch (error) {
    logError('Error comprovant preferit:', error)
    return apiOk({ isFavorite: false })
  }
}

