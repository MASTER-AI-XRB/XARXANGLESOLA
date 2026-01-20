export function getSocketUrl(): string | null {
  const rawEnvUrl = (process.env.NEXT_PUBLIC_SOCKET_URL || '').trim()
  const isBrowser = typeof window !== 'undefined'
  const hostname = isBrowser ? window.location.hostname : ''
  const isProductionHost =
    hostname.includes('vercel.app') ||
    hostname.includes('vercel.com') ||
    hostname.includes('railway.app')

  let socketUrl = rawEnvUrl

  if (!socketUrl && isBrowser && !isProductionHost) {
    const protocol = window.location.protocol === 'https:' ? 'https://' : 'http://'
    const host = hostname || 'localhost'
    socketUrl = `${protocol}${host}:3001`
  }

  if (!socketUrl) {
    return null
  }

  if (!socketUrl.startsWith('http://') && !socketUrl.startsWith('https://')) {
    const protocol = isProductionHost ? 'https://' : 'http://'
    socketUrl = `${protocol}${socketUrl}`
  }

  return socketUrl
}
