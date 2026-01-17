import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// Forçar que aquesta ruta sigui dinàmica (no es pot pre-renderitzar)
export const dynamic = 'force-dynamic'

// Comprovar si un producte està als preferits de l'usuari
export async function GET(request: NextRequest) {
  try {
    const userId = new URL(request.url).searchParams.get('userId')
    const productId = new URL(request.url).searchParams.get('productId')

    if (!userId || !productId) {
      return NextResponse.json({ isFavorite: false })
    }

    const favorite = await prisma.favorite.findUnique({
      where: {
        userId_productId: {
          userId,
          productId,
        },
      },
    })

    const isFavorite = !!favorite
    console.log(`Check favorite: userId=${userId}, productId=${productId}, isFavorite=${isFavorite}`)
    return NextResponse.json({ isFavorite })
  } catch (error) {
    console.error('Error comprovant preferit:', error)
    return NextResponse.json({ isFavorite: false })
  }
}

