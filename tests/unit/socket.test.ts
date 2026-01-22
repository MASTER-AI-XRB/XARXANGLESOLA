import { describe, expect, it, beforeEach, afterEach } from 'vitest'
import { getSocketUrl } from '@/lib/socket'

describe('getSocketUrl', () => {
  const originalEnv = { ...process.env }

  beforeEach(() => {
    process.env = { ...originalEnv }
  })

  afterEach(() => {
    process.env = { ...originalEnv }
  })

  it('returns env URL when provided', () => {
    process.env.NEXT_PUBLIC_SOCKET_URL = 'https://example.com'
    Object.defineProperty(window, 'location', {
      value: { hostname: 'xarxanglesola.vercel.app', protocol: 'https:' },
      writable: true,
    })
    expect(getSocketUrl()).toBe('https://example.com')
  })

  it('returns null when no env and production host', () => {
    process.env.NEXT_PUBLIC_SOCKET_URL = ''
    Object.defineProperty(window, 'location', {
      value: { hostname: 'app.vercel.app', protocol: 'https:' },
      writable: true,
    })
    expect(getSocketUrl()).toBeNull()
  })

  it('builds local socket URL when no env', () => {
    process.env.NEXT_PUBLIC_SOCKET_URL = ''
    Object.defineProperty(window, 'location', {
      value: { hostname: 'localhost', protocol: 'http:' },
      writable: true,
    })
    expect(getSocketUrl()).toBe('http://localhost:3001')
  })
})
