import { describe, expect, it, beforeEach } from 'vitest'
import { createSessionToken, verifySessionToken } from '@/lib/auth'

describe('auth tokens', () => {
  beforeEach(() => {
    process.env.AUTH_SECRET = 'test-secret'
  })

  it('creates and verifies a session token', () => {
    const token = createSessionToken('user-id', 'nickname')
    expect(token).toBeTruthy()
    const payload = verifySessionToken(token)
    expect(payload?.userId).toBe('user-id')
    expect(payload?.nickname).toBe('nickname')
  })

  it('returns null for tampered token', () => {
    const token = createSessionToken('user-id', 'nickname')
    expect(token).toBeTruthy()
    const tampered = `${token}-broken`
    expect(verifySessionToken(tampered)).toBeNull()
  })
})
