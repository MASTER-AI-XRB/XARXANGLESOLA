import { NextRequest } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { getAuthUserId } from '@/lib/auth'
import { validateUuid } from '@/lib/validation'
import { apiError, apiOk } from '@/lib/api-response'
import { logError } from '@/lib/logger'

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

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  const prisma = getPrisma()
  try {
    const resolvedParams = params instanceof Promise ? await params : params
    const idValidation = validateUuid(resolvedParams.id, 'producte')
    if (!idValidation.valid) {
      return apiError(idValidation.error, 400)
    }
    const authUserId = getAuthUserId(request)
    const { reserved } = await request.json()

    if (!authUserId) {
      return apiError('Usuari no autenticat', 401)
    }
    if (typeof reserved !== 'boolean') {
      return apiError('Valor de reserva no vàlid', 400)
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
      data: { reserved: reserved },
    })

    return apiOk({ reserved: updatedProduct.reserved })
  } catch (error) {
    logError('Error actualitzant reserva:', error)
    return apiError('Error actualitzant reserva', 500)
  } finally {
    await prisma.$disconnect()
  }
}

