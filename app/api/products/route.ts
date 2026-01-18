import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { put } from '@vercel/blob'
import { validateProductName, validateDescription, validateImageFile, sanitizeString } from '@/lib/validation'

export async function GET() {
  try {
    const products = await prisma.product.findMany({
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

    // Parsear les imatges JSON
    const productsWithParsedImages = products.map((product) => ({
      ...product,
      images: JSON.parse(product.images),
    }))

    return NextResponse.json(productsWithParsedImages)
  } catch (error) {
    console.error('Error carregant productes:', error)
    
    // Logging detallat
    if (error instanceof Error) {
      console.error('Error name:', error.name)
      console.error('Error message:', error.message)
      console.error('Error stack:', error.stack)
    }
    
    return NextResponse.json(
      { error: 'Error carregant productes' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const userId = formData.get('userId') as string

    if (!userId) {
      return NextResponse.json(
        { error: 'Usuari no autenticat' },
        { status: 401 }
      )
    }

    const name = formData.get('name') as string
    const description = formData.get('description') as string | null
    const images = formData.getAll('images') as File[]

    // Validar nom
    const nameValidation = validateProductName(name)
    if (!nameValidation.valid) {
      return NextResponse.json(
        { error: nameValidation.error },
        { status: 400 }
      )
    }

    // Validar descripció
    const descValidation = validateDescription(description)
    if (!descValidation.valid) {
      return NextResponse.json(
        { error: descValidation.error },
        { status: 400 }
      )
    }

    if (images.length === 0) {
      return NextResponse.json(
        { error: 'Afegeix almenys una imatge' },
        { status: 400 }
      )
    }

    if (images.length > 4) {
      return NextResponse.json(
        { error: 'Màxim 4 imatges' },
        { status: 400 }
      )
    }

    // Validar cada imatge
    for (const image of images) {
      const imageValidation = validateImageFile(image)
      if (!imageValidation.valid) {
        return NextResponse.json(
          { error: imageValidation.error },
          { status: 400 }
        )
      }
    }

    // Guardar imatges a Vercel Blob Storage
    const imagePaths: string[] = []
    
    // Verificar si BLOB_READ_WRITE_TOKEN està configurat (Vercel Blob)
    if (!process.env.BLOB_READ_WRITE_TOKEN) {
      console.warn('BLOB_READ_WRITE_TOKEN no configurat, intentant usar sistema de fitxers local...')
      // Fallback a sistema local (no funcionarà a Vercel però sí localment)
      try {
        const { writeFile, mkdir } = await import('fs/promises')
        const { join } = await import('path')
        const { existsSync } = await import('fs')
        
        const uploadsDir = join(process.cwd(), 'public', 'uploads')
        if (!existsSync(uploadsDir)) {
          await mkdir(uploadsDir, { recursive: true })
        }

        for (const image of images) {
          const bytes = await image.arrayBuffer()
          const buffer = Buffer.from(bytes)
          
          const sanitizedName = sanitizeString(image.name, 100)
            .replace(/[^a-zA-Z0-9.-]/g, '_')
          const filename = `${Date.now()}-${Math.random().toString(36).substring(7)}-${sanitizedName}`
          const filepath = join(uploadsDir, filename)
          await writeFile(filepath, buffer)
          imagePaths.push(`/uploads/${filename}`)
        }
      } catch (fallbackError) {
        console.error('Error amb fallback local:', fallbackError)
        return NextResponse.json(
          { error: 'Error al pujar imatges. Configura Vercel Blob Storage per producció.' },
          { status: 500 }
        )
      }
    } else {
      // Usar Vercel Blob Storage
      for (const image of images) {
        try {
          const bytes = await image.arrayBuffer()
          const buffer = Buffer.from(bytes)
          
          // Sanititzar el nom del fitxer
          const sanitizedName = sanitizeString(image.name, 100)
            .replace(/[^a-zA-Z0-9.-]/g, '_')
          const filename = `product-${Date.now()}-${Math.random().toString(36).substring(7)}-${sanitizedName}`
          
          // Pujar a Vercel Blob
          const blob = await put(filename, buffer, {
            access: 'public',
            addRandomSuffix: true,
            contentType: image.type,
          })
          
          imagePaths.push(blob.url)
        } catch (blobError) {
          console.error('Error pujant imatge a Blob:', blobError)
          
          // Logging detallat
          if (blobError instanceof Error) {
            console.error('Blob error name:', blobError.name)
            console.error('Blob error message:', blobError.message)
            console.error('Blob error stack:', blobError.stack)
          }
          
          // Verificar si és un error d'autenticació amb Blob
          const errorMessage = blobError instanceof Error && blobError.message.includes('token')
            ? 'Error d\'autenticació amb Vercel Blob. Verifica BLOB_READ_WRITE_TOKEN.'
            : 'Error al pujar imatges a Vercel Blob'
          
          return NextResponse.json(
            { error: errorMessage },
            { status: 500 }
          )
        }
      }
    }

    // Crear producte
    const product = await prisma.product.create({
      data: {
        name: sanitizeString(name, 100),
        description: description ? sanitizeString(description, 2000) : null,
        images: JSON.stringify(imagePaths),
        userId,
      },
      include: {
        user: {
          select: {
            nickname: true,
          },
        },
      },
    })

    return NextResponse.json({
      ...product,
      images: JSON.parse(product.images),
    })
  } catch (error) {
    console.error('Error creant producte:', error)
    
    // Logging detallat per diagnosticar
    if (error instanceof Error) {
      console.error('Error name:', error.name)
      console.error('Error message:', error.message)
      console.error('Error stack:', error.stack)
    }
    
    // Retornar més informació en desenvolupament
    const errorMessage = process.env.NODE_ENV === 'production'
      ? 'Error al crear el producte'
      : error instanceof Error ? error.message : 'Error desconegut'
    
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    )
  }
}

