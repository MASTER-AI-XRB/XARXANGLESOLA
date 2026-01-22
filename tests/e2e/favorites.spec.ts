import { test, expect } from '@playwright/test'
import path from 'path'

const baseURL =
  process.env.PLAYWRIGHT_BASE_URL ||
  `http://localhost:${process.env.PLAYWRIGHT_PORT || '3005'}`

const suffix = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`.slice(-8)
const userA = {
  nickname: `o${suffix}`,
  email: `owner_${suffix}@example.com`,
  password: 'password123',
}

const userB = {
  nickname: `f${suffix}`,
  email: `fan_${suffix}@example.com`,
  password: 'password123',
}

test('favorite flow', async ({ page, request }) => {
  const registerOwner = await request.post('/api/auth/login', {
    data: {
      nickname: userA.nickname,
      email: userA.email,
      password: userA.password,
      isNewUser: true,
    },
  })
  if (!registerOwner.ok()) {
    throw new Error(await registerOwner.text())
  }
  const ownerData = await registerOwner.json()

  await page.context().addCookies([
    {
      name: 'xarxa_session',
      value: ownerData.socketToken || '',
      url: baseURL,
    },
  ])
  await page.addInitScript(
    ({ nickname, token }) => {
      localStorage.setItem('nickname', nickname)
      if (token) {
        localStorage.setItem('socketToken', token)
      }
    },
    { nickname: userA.nickname, token: ownerData.socketToken || '' }
  )

  const productName = `Preferit ${Date.now()}`
  await page.goto('/app/products/new')
  await expect(page).toHaveURL(/\/app\/products\/new/, { timeout: 10000 })
  await page.locator('#name').fill(productName)
  await page.locator('#description').fill('Producte per preferits')
  const imagePath = path.join(process.cwd(), 'public', 'logo.png')
  await page.locator('#images').setInputFiles(imagePath)
  const [createResponse] = await Promise.all([
    page.waitForResponse(
      (response) =>
        response.url().includes('/api/products') &&
        response.request().method() === 'POST'
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

  const browser = page.context().browser()
  const userBContext = await browser!.newContext()
  const userBPage = await userBContext.newPage()

  const registerFan = await request.post('/api/auth/login', {
    data: {
      nickname: userB.nickname,
      email: userB.email,
      password: userB.password,
      isNewUser: true,
    },
  })
  if (!registerFan.ok()) {
    throw new Error(await registerFan.text())
  }
  const fanData = await registerFan.json()

  await userBContext.addCookies([
    {
      name: 'xarxa_session',
      value: fanData.socketToken || '',
      url: baseURL,
    },
  ])
  await userBPage.addInitScript(
    ({ nickname, token }) => {
      localStorage.setItem('nickname', nickname)
      if (token) {
        localStorage.setItem('socketToken', token)
      }
    },
    { nickname: userB.nickname, token: fanData.socketToken || '' }
  )

  await userBPage.goto('/app')
  await expect(userBPage).toHaveURL(/\/app/, { timeout: 10000 })
  const productLink = userBPage.getByRole('link', { name: productName })
  await expect(productLink).toBeVisible({ timeout: 20000 })

  const favoriteToggle = userBPage.locator(
    `[data-testid="favorite-toggle-${createdProduct.id}"]`
  )
  await expect(favoriteToggle).toBeVisible({ timeout: 20000 })
  const [favoriteResponse] = await Promise.all([
    userBPage.waitForResponse(
      (response) =>
        response.url().includes('/api/favorites') &&
        response.request().method() === 'POST'
    ),
    favoriteToggle.click(),
  ])
  expect(favoriteResponse.ok()).toBeTruthy()

  await userBPage.goto('/app/favorites')
  await expect(userBPage.getByText(productName)).toBeVisible()

  await userBContext.close()
})
