import { NextRequest } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { getAuthUserId } from '@/lib/auth'
import { validateUuid } from '@/lib/validation'
import { apiError, apiOk } from '@/lib/api-response'
import { logError } from '@/lib/logger'

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
    return apiOk({ reserved: updated.reserved })
  } catch (error) {
    logError('Error actualitzant reserva:', error)
    return apiError('Error actualitzant reserva', 500)
  } finally {
    await prisma.$disconnect()
  }
}
