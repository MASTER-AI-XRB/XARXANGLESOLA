import { NextRequest } from 'next/server'
import { PrismaClient } from '@prisma/client'
import crypto from 'crypto'
import nodemailer from 'nodemailer'
import { apiError, apiOk } from '@/lib/api-response'
import { logError, logInfo } from '@/lib/logger'

const prisma = new PrismaClient()

// Configuració del transporter d'email (ajusta segons el teu proveïdor)
const getEmailTransporter = () => {
  // Per a desenvolupament, pots usar Gmail o qualsevol altre servei
  // En producció, hauràs de configurar les variables d'entorn
  if (process.env.EMAIL_HOST && process.env.EMAIL_USER && process.env.EMAIL_PASS) {
    return nodemailer.createTransport({
      host: process.env.EMAIL_HOST,
      port: parseInt(process.env.EMAIL_PORT || '587'),
      secure: process.env.EMAIL_SECURE === 'true',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    })
  }
  
  // Mode desenvolupament: crear un transporter de prova (no envia emails reals)
  // Pots usar serveis com Mailtrap, Ethereal Email, o simplement loguejar l'email
  return nodemailer.createTransport({
    host: 'smtp.ethereal.email',
    port: 587,
    auth: {
      user: 'ethereal.user@ethereal.email',
      pass: 'ethereal.pass',
    },
  })
}

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json()

    if (!email) {
      return apiError('L\'email és obligatori', 400)
    }

    // Validar format d'email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email.trim())) {
      return apiError('Format d\'email invàlid', 400)
    }

    // Buscar usuari per email
    const user = await prisma.user.findUnique({
      where: { email: email.trim().toLowerCase() },
    })

    // Per seguretat, sempre retornem èxit encara que l'email no existeixi
    // Això evita que algú pugui descobrir quins emails estan registrats
    if (!user) {
      return apiOk({
        message: 'Si l\'email existeix, s\'ha enviat un enllaç de recuperació',
      })
    }

    // Generar token de recuperació
    const resetToken = crypto.randomBytes(32).toString('hex')
    const resetTokenExpiry = new Date()
    resetTokenExpiry.setHours(resetTokenExpiry.getHours() + 1) // Vàlid per 1 hora

    // Guardar token a la base de dades
    await prisma.user.update({
      where: { id: user.id },
      data: {
        resetToken,
        resetTokenExpiry,
      },
    })

    // Generar URL de recuperació
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'
    const resetUrl = `${baseUrl}/reset-password/${resetToken}`

    // Enviar email
    try {
      const transporter = getEmailTransporter()
      
      const mailOptions = {
        from: process.env.EMAIL_FROM || 'noreply@xarxanglesola.com',
        to: user.email!,
        subject: 'Recuperació de contrasenya - Xarxa Anglesola',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #2563eb;">Recuperació de contrasenya</h2>
            <p>Hola ${user.nickname},</p>
            <p>Has sol·licitat restablir la teva contrasenya. Fes clic al següent enllaç per crear una nova contrasenya:</p>
            <p style="margin: 20px 0;">
              <a href="${resetUrl}" style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
                Restablir contrasenya
              </a>
            </p>
            <p>O copia i enganxa aquest enllaç al teu navegador:</p>
            <p style="color: #666; word-break: break-all;">${resetUrl}</p>
            <p style="color: #999; font-size: 12px; margin-top: 30px;">
              Aquest enllaç expira en 1 hora. Si no has sol·licitat aquest canvi, ignora aquest email.
            </p>
          </div>
        `,
        text: `
          Recuperació de contrasenya - Xarxa Anglesola
          
          Hola ${user.nickname},
          
          Has sol·licitat restablir la teva contrasenya. Fes clic al següent enllaç per crear una nova contrasenya:
          
          ${resetUrl}
          
          Aquest enllaç expira en 1 hora. Si no has sol·licitat aquest canvi, ignora aquest email.
        `,
      }

      await transporter.sendMail(mailOptions)
      
      // En desenvolupament, loguejar l'URL per facilitar les proves
      if (process.env.NODE_ENV === 'development') {
        logInfo('🔗 Enllaç de recuperació de contrasenya:', resetUrl)
      }
    } catch (emailError) {
      logError('Error enviant email:', emailError)
      // En desenvolupament, no fallar si no hi ha configuració d'email
      if (process.env.NODE_ENV === 'development') {
        logInfo('⚠️  Mode desenvolupament: Email no enviat. URL de recuperació:', resetUrl)
      } else {
        // En producció, si falla l'email, eliminar el token
        await prisma.user.update({
          where: { id: user.id },
          data: {
            resetToken: null,
            resetTokenExpiry: null,
          },
        })
        return apiError('Error enviant l\'email de recuperació', 500)
      }
    }

    return apiOk({
      message: 'Si l\'email existeix, s\'ha enviat un enllaç de recuperació',
    })
  } catch (error) {
    logError('Error en forgot-password:', error)
    return apiError('Error processant la sol·licitud', 500)
  }
}

