import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { validateNickname, sanitizeString } from '@/lib/validation'
import bcrypt from 'bcryptjs'

export async function POST(request: NextRequest) {
  try {
    const { nickname, email, password, isNewUser } = await request.json()

    if (!nickname) {
      return NextResponse.json(
        { error: 'El nickname és obligatori' },
        { status: 400 }
      )
    }

    if (!password) {
      return NextResponse.json(
        { error: 'La contrasenya és obligatòria' },
        { status: 400 }
      )
    }

    // Validar nickname
    const validation = validateNickname(nickname)
    if (!validation.valid) {
      return NextResponse.json(
        { error: validation.error },
        { status: 400 }
      )
    }

    // Validar contrasenya
    if (password.length < 6) {
      return NextResponse.json(
        { error: 'La contrasenya ha de tenir almenys 6 caràcters' },
        { status: 400 }
      )
    }

    const sanitizedNickname = sanitizeString(nickname, 20)

    // Buscar usuari
    let user = await prisma.user.findUnique({
      where: { nickname: sanitizedNickname },
    })

    if (isNewUser) {
      // Validacions per a nous usuaris
      if (!email) {
        return NextResponse.json(
          { error: 'L\'email és obligatori per a nous usuaris' },
          { status: 400 }
        )
      }

      // Validar format d'email
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailRegex.test(email.trim())) {
        return NextResponse.json(
          { error: 'Format d\'email invàlid' },
          { status: 400 }
        )
      }

      // Comprovar si l'usuari ja existeix
      if (user) {
        return NextResponse.json(
          { error: 'Aquest nickname ja està en ús' },
          { status: 400 }
        )
      }

      // Comprovar si l'email ja està en ús
      const existingEmail = await prisma.user.findUnique({
        where: { email: email.trim().toLowerCase() },
      })

      if (existingEmail) {
        return NextResponse.json(
          { error: 'Aquest email ja està registrat' },
          { status: 400 }
        )
      }

      // Crear nou usuari amb email i contrasenya encriptada
      const hashedPassword = await bcrypt.hash(password, 10)
      user = await prisma.user.create({
        data: {
          nickname: sanitizedNickname,
          email: email.trim().toLowerCase(),
          password: hashedPassword,
        },
      })
    } else {
      // Login d'usuari existent
      if (!user) {
        return NextResponse.json(
          { error: 'Nickname o contrasenya incorrectes' },
          { status: 401 }
        )
      }

      // Si l'usuari no té contrasenya (usuaris antics), crear-la
      if (!user.password) {
        const hashedPassword = await bcrypt.hash(password, 10)
        user = await prisma.user.update({
          where: { id: user.id },
          data: { password: hashedPassword },
        })
      } else {
        // Verificar contrasenya per a usuaris existents
        const isValidPassword = await bcrypt.compare(password, user.password)
        if (!isValidPassword) {
          return NextResponse.json(
            { error: 'Nickname o contrasenya incorrectes' },
            { status: 401 }
          )
        }
      }
    }

    return NextResponse.json({
      userId: user.id,
      nickname: user.nickname,
    })
  } catch (error) {
    console.error('Error en login:', error)
    console.error('Error details:', error instanceof Error ? error.message : String(error))
    console.error('Stack:', error instanceof Error ? error.stack : 'No stack trace')
    
    // Log més detallat per Vercel
    if (error instanceof Error) {
      console.error('Error name:', error.name)
      console.error('Error message:', error.message)
    }
    
    // Verificar si és un error de Prisma
    if (error && typeof error === 'object' && 'code' in error) {
      console.error('Prisma error code:', (error as any).code)
    }
    
    // No revelar detalls de l'error a l'usuari, però logar-lo per debugging
    return NextResponse.json(
      { 
        error: 'Error al iniciar sessió',
        details: process.env.NODE_ENV === 'development' ? (error instanceof Error ? error.message : String(error)) : undefined
      },
      { status: 500 }
    )
  } finally {
    // Desconnectar Prisma després de cada operació a Vercel
    await prisma.$disconnect().catch(() => {
      // Ignorar errors de desconnexió
    })
  }
}

