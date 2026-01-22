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
