import { test, expect } from '@playwright/test'
import path from 'path'

const suffix = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`.slice(-8)
const user = {
  nickname: `p${suffix}`,
  email: `product_${suffix}@example.com`,
  password: 'password123',
}

test('create product and view detail', async ({ page }) => {
  await page.goto('/')

  await page.locator('#isNewUser').check()
  await page.locator('#nickname').fill(user.nickname)
  await page.locator('#email').fill(user.email)
  await page.locator('#password').fill(user.password)
  await page.locator('#confirmPassword').fill(user.password)
  await page.locator('form button[type="submit"]').click()
  await expect(page).toHaveURL(/\/app/, { timeout: 20000 })

  await page.goto('/app/products/new')
  const productName = `Producte test ${Date.now()}`
  await page.locator('#name').fill(productName)
  await page.locator('#description').fill('Descripcio de test')
  const imagePath = path.join(process.cwd(), 'public', 'logo.png')
  await page.locator('#images').setInputFiles(imagePath)
  const [createResponse] = await Promise.all([
    page.waitForResponse((response) =>
      response.url().includes('/api/products') && response.request().method() === 'POST'
    ),
    page.locator('form button[type="submit"]').click(),
  ])
  if (!createResponse.ok()) {
    throw new Error(
      `Crear producte fallit: ${createResponse.status()} ${await createResponse.text()}`
    )
  }
  const createdProduct = await createResponse.json()
  await expect(page).toHaveURL(/\/app/, { timeout: 20000 })
  await page.goto(`/app/products/${createdProduct.id}`)
  await expect(page).toHaveURL(/\/app\/products\//, { timeout: 20000 })
  await expect(page.getByText(productName)).toBeVisible()
})
