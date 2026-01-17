import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

// Funció helper per obtenir instància de Prisma (consistent amb reserve/route.ts)
function getPrisma() {
  try {
    return new PrismaClient({
      log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
    })
  } catch (error) {
    console.error('Error creant PrismaClient:', error)
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
    const { userId, prestec } = await request.json()

    if (!userId) {
      return NextResponse.json(
        { error: 'Usuari no autenticat' },
        { status: 401 }
      )
    }

    // Comprovar que l'usuari és el propietari
    const product = await prisma.product.findUnique({
      where: { id: resolvedParams.id },
    })

    if (!product) {
      return NextResponse.json(
        { error: 'Producte no trobat' },
        { status: 404 }
      )
    }

    if (product.userId !== userId) {
      return NextResponse.json(
        { error: 'No tens permisos per modificar aquest producte' },
        { status: 403 }
      )
    }

    const updatedProduct = await prisma.product.update({
      where: { id: resolvedParams.id },
      data: { prestec: prestec },
      include: {
        user: {
          select: {
            nickname: true,
          },
        },
      },
    })

    return NextResponse.json({
      ...updatedProduct,
      images: JSON.parse(updatedProduct.images),
    })
  } catch (error) {
    console.error('Error actualitzant préstec:', error)
    console.error('Error details:', error instanceof Error ? error.message : String(error))
    console.error('Stack:', error instanceof Error ? error.stack : 'No stack trace')
    return NextResponse.json(
      { 
        error: 'Error actualitzant préstec',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    )
  } finally {
    await prisma.$disconnect()
  }
}
