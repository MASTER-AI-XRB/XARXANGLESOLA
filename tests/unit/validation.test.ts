import { describe, expect, it } from 'vitest'
import {
  sanitizeString,
  validateNickname,
  validateProductName,
  validateDescription,
  validateMessage,
  validateImageFile,
  validateUuid,
} from '@/lib/validation'

describe('validation utils', () => {
  it('sanitizeString trims and limits length', () => {
    const value = sanitizeString('  hello world  ', 5)
    expect(value).toBe('hello')
  })

  it('validateNickname accepts valid nicknames', () => {
    expect(validateNickname('User_1').valid).toBe(true)
  })

  it('validateNickname rejects invalid nicknames', () => {
    expect(validateNickname('ab').valid).toBe(false)
    expect(validateNickname('bad name').valid).toBe(false)
  })

  it('validateProductName rejects short names', () => {
    expect(validateProductName('ab').valid).toBe(false)
  })

  it('validateDescription allows null and limits length', () => {
    expect(validateDescription(null).valid).toBe(true)
    expect(validateDescription('a'.repeat(2001)).valid).toBe(false)
  })

  it('validateMessage enforces non-empty and max length', () => {
    expect(validateMessage('').valid).toBe(false)
    expect(validateMessage('hola').valid).toBe(true)
    expect(validateMessage('a'.repeat(1001)).valid).toBe(false)
  })

  it('validateImageFile enforces types and size', () => {
    const file = new File(['data'], 'test.png', { type: 'image/png' })
    expect(validateImageFile(file).valid).toBe(true)
  })

  it('validateUuid checks UUID format', () => {
    expect(validateUuid('not-a-uuid', 'producte').valid).toBe(false)
    expect(validateUuid('d290f1ee-6c54-4b01-90e6-d701748f0851', 'producte').valid).toBe(true)
  })
})
