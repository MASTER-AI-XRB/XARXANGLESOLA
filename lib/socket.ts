/**
 * URL del servidor Socket per crides des del servidor (API routes).
 * En dev retorna localhost:3001 perquè els clients connecten al socket local.
 * En producció retorna NEXT_PUBLIC_SOCKET_URL (p. ex. Railway).
 */
export function getSocketServerUrl(): string {
  if (process.env.NODE_ENV === 'development') {
    const port = process.env.SOCKET_PORT || '3001'
    return `http://127.0.0.1:${port}`
  }
  const url = (process.env.NEXT_PUBLIC_SOCKET_URL || '').trim().replace(/\/$/, '')
  return url.startsWith('http://') || url.startsWith('https://') ? url : url ? `https://${url}` : ''
}

export function getSocketUrl(): string | null {
  const rawEnvUrl = (process.env.NEXT_PUBLIC_SOCKET_URL || '').trim()
  const isBrowser = typeof window !== 'undefined'
  const hostname = isBrowser ? window.location.hostname : ''
  const isProductionHost =
    hostname.includes('vercel.app') ||
    hostname.includes('vercel.com') ||
    hostname.includes('railway.app')

  const isLocalhostHost = hostname === 'localhost' || hostname === '127.0.0.1'
  const isEnvLocalhost = rawEnvUrl.includes('localhost') || rawEnvUrl.includes('127.0.0.1')

  const override =
    isBrowser && window.localStorage
      ? window.localStorage.getItem('socketUrlOverride')
      : null

  if (override) {
    if (override === 'env') {
      return rawEnvUrl || null
    }
    if (override === 'local') {
      const protocol = window.location.protocol === 'https:' ? 'https://' : 'http://'
      const host = hostname || 'localhost'
      return `${protocol}${host}:3001`
    }
    if (override.startsWith('http://') || override.startsWith('https://')) {
      return override
    }
  }

  let socketUrl =
    isLocalhostHost && rawEnvUrl && !isEnvLocalhost
      ? ''
      : rawEnvUrl

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
