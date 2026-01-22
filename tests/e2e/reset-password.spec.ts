import { test, expect } from '@playwright/test'
import { PrismaClient } from '@prisma/client'
import crypto from 'crypto'

const suffix = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`.slice(-8)
const user = {
  nickname: `r${suffix}`,
  email: `reset_${suffix}@example.com`,
  password: 'password123',
  newPassword: 'newpass123',
}

test('reset password flow', async ({ page, request }) => {
  const prisma = new PrismaClient()

  try {
    const registerResponse = await request.post('/api/auth/login', {
      data: {
        nickname: user.nickname,
        email: user.email,
        password: user.password,
        isNewUser: true,
      },
    })
    expect(registerResponse.ok()).toBeTruthy()

    const resetToken = crypto.randomBytes(32).toString('hex')
    const resetTokenExpiry = new Date(Date.now() + 60 * 60 * 1000)
    await prisma.user.update({
      where: { nickname: user.nickname },
      data: { resetToken, resetTokenExpiry },
    })

    await page.goto(`/reset-password/${resetToken}`)
    await page.locator('#password').fill(user.newPassword)
    await page.locator('#confirmPassword').fill(user.newPassword)
    await page.locator('form button[type="submit"]').click()

    await expect(
      page.getByText(/Contrasenya restablida correctament/i)
    ).toBeVisible({ timeout: 10000 })

    await expect(page).toHaveURL(/\//, { timeout: 15000 })

    const loginResponse = await request.post('/api/auth/login', {
      data: {
        nickname: user.nickname,
        password: user.newPassword,
        isNewUser: false,
      },
    })
    expect(loginResponse.ok()).toBeTruthy()
  } finally {
    await prisma.$disconnect()
  }
})
