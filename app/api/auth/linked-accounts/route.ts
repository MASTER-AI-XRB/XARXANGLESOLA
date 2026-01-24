import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/nextauth'
import { prisma } from '@/lib/prisma'
import { apiError, apiOk } from '@/lib/api-response'

export const dynamic = 'force-dynamic'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return apiError('Usuari no autenticat', 401)
  }

  const accounts = await prisma.account.findMany({
    where: { userId: session.user.id },
    select: { provider: true },
  })
  const providers = accounts.map((a) => a.provider)
  return apiOk({ providers })
}
