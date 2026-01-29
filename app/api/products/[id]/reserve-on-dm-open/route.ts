import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthUserId } from '@/lib/auth'
import { validateUuid } from '@/lib/validation'
import { apiError, apiOk } from '@/lib/api-response'
import { logError } from '@/lib/logger'

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

    await prisma.product.update({
      where: { id: resolvedParams.id },
      data: { reserved: true, reservedById: authUserId },
    })

    return apiOk({ reserved: true, alreadyReserved: false })
  } catch (error) {
    logError('Error reservant producte (obertura DM):', error)
    return apiError('Error reservant producte', 500)
  }
}
