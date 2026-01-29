import { apiError, apiOk } from '@/lib/api-response'

export const dynamic = 'force-dynamic'

export async function GET() {
  const key = process.env.VAPID_PUBLIC_KEY?.trim()
  if (!key) {
    return apiError('VAPID no configurat', 503)
  }
  return apiOk({ publicKey: key })
}
