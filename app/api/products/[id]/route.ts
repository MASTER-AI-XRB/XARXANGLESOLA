import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthUserId } from '@/lib/auth'
import { mapProduct } from '@/lib/product-map'
import { validateUuid } from '@/lib/validation'
import { apiError, apiOk } from '@/lib/api-response'
import { logError } from '@/lib/logger'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const resolvedParams = params instanceof Promise ? await params : params
    const idValidation = validateUuid(resolvedParams.id, 'producte')
    if (!idValidation.valid) {
      return apiError(idValidation.error, 400)
    }
    const product = await prisma.product.findUnique({
      where: { id: resolvedParams.id },
      include: {
        user: {
          select: {
            nickname: true,
          },
        },
      },
    })

    if (!product) {
      return apiError('Producte no trobat', 404)
    }

    return apiOk(mapProduct(product))
  } catch (error) {
    logError('Error carregant producte:', error)
    return apiError('Error carregant producte', 500)
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const resolvedParams = params instanceof Promise ? await params : params
    const idValidation = validateUuid(resolvedParams.id, 'producte')
    if (!idValidation.valid) {
      return apiError(idValidation.error, 400)
    }
    const authUserId = getAuthUserId(request)

    if (!authUserId) {
      return apiError('Usuari no autenticat', 401)
    }

    // Comprovar que l'usuari és el propietari
    const product = await prisma.product.findUnique({
      where: { id: resolvedParams.id },
    })

    if (!product) {
      return apiError('Producte no trobat', 404)
    }

    if (product.userId !== authUserId) {
      return apiError('No tens permisos per eliminar aquest producte', 403)
    }

    // Eliminar el producte (les imatges s'eliminaran manualment si cal)
    await prisma.product.delete({
      where: { id: resolvedParams.id },
    })

    return apiOk({ message: 'Producte eliminat correctament' })
  } catch (error) {
    logError('Error eliminant producte:', error)
    return apiError('Error eliminant producte', 500)
  }
}

