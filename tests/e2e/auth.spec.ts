import { test, expect } from '@playwright/test'

const suffix = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`.slice(-8)
const user = {
  nickname: `u${suffix}`,
  email: `test_${suffix}@example.com`,
  password: 'password123',
}

test('register and login', async ({ page }) => {
  await page.goto('/')

  await page.locator('#isNewUser').check()
  await page.locator('#nickname').fill(user.nickname)
  await page.locator('#email').fill(user.email)
  await page.locator('#password').fill(user.password)
  await page.locator('#confirmPassword').fill(user.password)

  await page.locator('form button[type="submit"]').click()
  await expect(page).toHaveURL(/\/app/, { timeout: 20000 })
})
