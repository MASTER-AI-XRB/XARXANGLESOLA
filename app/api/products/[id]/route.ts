import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const resolvedParams = params instanceof Promise ? await params : params
    const product = await prisma.product.findUnique({
      where: { id: resolvedParams.id },
      include: {
        user: {
          select: {
            nickname: true,
            id: true,
          },
        },
      },
    })

    if (!product) {
      return NextResponse.json(
        { error: 'Producte no trobat' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      ...product,
      images: JSON.parse(product.images),
    })
  } catch (error) {
    console.error('Error carregant producte:', error)
    return NextResponse.json(
      { error: 'Error carregant producte' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const resolvedParams = params instanceof Promise ? await params : params
    const { userId } = await request.json()

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
        { error: 'No tens permisos per eliminar aquest producte' },
        { status: 403 }
      )
    }

    // Eliminar el producte (les imatges s'eliminaran manualment si cal)
    await prisma.product.delete({
      where: { id: resolvedParams.id },
    })

    return NextResponse.json({ message: 'Producte eliminat correctament' })
  } catch (error) {
    console.error('Error eliminant producte:', error)
    return NextResponse.json(
      { error: 'Error eliminant producte' },
      { status: 500 }
    )
  }
}

