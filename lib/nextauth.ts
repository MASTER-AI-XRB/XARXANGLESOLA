import type { NextAuthOptions } from 'next-auth'
import GoogleProvider from 'next-auth/providers/google'
import { PrismaAdapter } from '@next-auth/prisma-adapter'
import { prisma } from '@/lib/prisma'

// Fallback per Vercel: si NEXTAUTH_URL no existeix, usar VERCEL_URL
if (!process.env.NEXTAUTH_URL && process.env.VERCEL_URL) {
  process.env.NEXTAUTH_URL = `https://${process.env.VERCEL_URL}`
}

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  session: {
    strategy: 'database',
  },
  secret: process.env.AUTH_SECRET,
  debug: process.env.NODE_ENV !== 'production',
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || '',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
      allowDangerousEmailAccountLinking: true,
      authorization: {
        params: { prompt: 'select_account' },
      },
    }),
  ],
  events: {
    async signIn({ user }) {
      if (!user?.id) return
      const { prisma } = await import('@/lib/prisma')
      const u = await prisma.user.findUnique({
        where: { id: user.id },
        select: { id: true, nickname: true, password: true, lastLoginAt: true },
      })
      if (!u) return
      const hasPassword = Boolean(u.password)
      const monthAgo = new Date()
      monthAgo.setDate(monthAgo.getDate() - 30)
      const expired =
        !hasPassword &&
        !!u.nickname &&
        !!u.lastLoginAt &&
        u.lastLoginAt < monthAgo
      await prisma.user.update({
        where: { id: user.id },
        data: {
          lastLoginAt: new Date(),
          ...(expired ? { nickname: null } : {}),
        },
      })
    },
  },
  callbacks: {
    async signIn() {
      return true
    },
    async session({ session, user }) {
      if (session.user) {
        session.user.id = user.id
        session.user.nickname = user.nickname || null
      }
      session.needsNickname = !user.nickname
      return session
    },
  },
  pages: {
    signIn: '/',
  },
}
