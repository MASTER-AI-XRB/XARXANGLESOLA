import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { mapProduct } from '@/lib/product-map'
import { apiError, apiOk } from '@/lib/api-response'
import { logError } from '@/lib/logger'

export const dynamic = 'force-dynamic'

export async function GET(
  request: NextRequest,
  { params }: { params: { nickname: string } }
) {
  try {
    const nickname = params?.nickname
    if (!nickname) {
      return apiError('Nickname invàlid', 400)
    }
    const products = await prisma.product.findMany({
      where: {
        user: {
          nickname: { equals: nickname, mode: 'insensitive' },
        },
      },
      include: {
        user: { select: { nickname: true } },
        reservedBy: { select: { nickname: true } },
        _count: { select: { favorites: true } },
      },
      orderBy: { createdAt: 'desc' },
    })

    const productsWithParsedImages = products.map(mapProduct)
    return apiOk(productsWithParsedImages)
  } catch (error) {
    logError('Error carregant productes de l\'usuari:', error)
    return apiError('Error carregant productes', 500)
  }
}
