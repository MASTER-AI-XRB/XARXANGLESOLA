import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// Obtenir productes de l'usuari
export async function GET(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id') || 
                   new URL(request.url).searchParams.get('userId')

    if (!userId) {
      return NextResponse.json(
        { error: 'Usuari no autenticat' },
        { status: 401 }
      )
    }

    const products = await prisma.product.findMany({
      where: { userId },
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

    const productsWithParsedImages = products.map((product) => ({
      ...product,
      images: JSON.parse(product.images),
    }))

    return NextResponse.json(productsWithParsedImages)
  } catch (error) {
    console.error('Error carregant productes de l\'usuari:', error)
    return NextResponse.json(
      { error: 'Error carregant productes' },
      { status: 500 }
    )
  }
}

