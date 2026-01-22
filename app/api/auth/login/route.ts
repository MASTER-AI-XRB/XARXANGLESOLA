import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { validateNickname, sanitizeString } from '@/lib/validation'
import bcrypt from 'bcryptjs'
import { createSessionToken, sessionCookieName, sessionMaxAgeSeconds } from '@/lib/auth'
import { apiError } from '@/lib/api-response'
import { logError } from '@/lib/logger'

export async function POST(request: NextRequest) {
  try {
    const { nickname, email, password, isNewUser } = await request.json()

    if (!nickname) {
      return apiError('El nickname és obligatori', 400)
    }

    if (!password) {
      return apiError('La contrasenya és obligatòria', 400)
    }

    // Validar nickname
    const validation = validateNickname(nickname)
    if (!validation.valid) {
      return apiError(validation.error || 'Nickname invàlid', 400)
    }

    // Validar contrasenya
    if (password.length < 6) {
      return apiError('La contrasenya ha de tenir almenys 6 caràcters', 400)
    }

    const sanitizedNickname = sanitizeString(nickname, 20)

    // Buscar usuari
    let user = await prisma.user.findUnique({
      where: { nickname: sanitizedNickname },
    })

    if (isNewUser) {
      // Validacions per a nous usuaris
      if (!email) {
        return apiError('L\'email és obligatori per a nous usuaris', 400)
      }

      // Validar format d'email
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailRegex.test(email.trim())) {
        return apiError('Format d\'email invàlid', 400)
      }

      // Comprovar si l'usuari ja existeix
      if (user) {
        return apiError('Aquest nickname ja està en ús', 400)
      }

      // Comprovar si l'email ja està en ús
      const existingEmail = await prisma.user.findUnique({
        where: { email: email.trim().toLowerCase() },
      })

      if (existingEmail) {
        return apiError('Aquest email ja està registrat', 400)
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
        return apiError('Nickname o contrasenya incorrectes', 401)
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
          return apiError('Nickname o contrasenya incorrectes', 401)
        }
      }
    }

    const token = createSessionToken(user.id, user.nickname)
    if (!token && process.env.NODE_ENV === 'production') {
      return apiError('AUTH_SECRET no configurat a producció', 500)
    }
    const response = NextResponse.json({
      nickname: user.nickname,
      socketToken: token || null,
    })
    if (token) {
      response.cookies.set(sessionCookieName, token, {
        httpOnly: true,
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
        maxAge: sessionMaxAgeSeconds,
        path: '/',
      })
    }
    return response
  } catch (error) {
    logError('Error en login:', error)

    // No revelar detalls de l'error a l'usuari, però logar-lo per debugging
    return apiError('Error al iniciar sessió', 500, {
      details:
        process.env.NODE_ENV === 'development'
          ? error instanceof Error
            ? error.message
            : String(error)
          : undefined,
    })
  } finally {
    // Desconnectar Prisma després de cada operació a Vercel
    await prisma.$disconnect().catch(() => {
      // Ignorar errors de desconnexió
    })
  }
}

