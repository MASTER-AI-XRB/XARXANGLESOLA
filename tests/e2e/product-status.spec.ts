import { test, expect } from '@playwright/test'
import path from 'path'

const baseURL =
  process.env.PLAYWRIGHT_BASE_URL ||
  `http://localhost:${process.env.PLAYWRIGHT_PORT || '3005'}`

const suffix = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`.slice(-8)
const user = {
  nickname: `s${suffix}`,
  email: `status_${suffix}@example.com`,
  password: 'password123',
}

test('reserve and prestec toggles', async ({ page, request }) => {
  const registerResponse = await request.post('/api/auth/login', {
    data: {
      nickname: user.nickname,
      email: user.email,
      password: user.password,
      isNewUser: true,
    },
  })
  if (!registerResponse.ok()) {
    throw new Error(await registerResponse.text())
  }
  const userData = await registerResponse.json()

  await page.context().addCookies([
    {
      name: 'xarxa_session',
      value: userData.socketToken || '',
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
    { nickname: user.nickname, token: userData.socketToken || '' }
  )

  await page.goto('/app/products/new')
  const productName = `Estat ${Date.now()}`
  await page.locator('#name').fill(productName)
  await page.locator('#description').fill('Producte per estat')
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

  const reserveButton = page.getByRole('button', { name: /reservar|desreservar/i })
  await expect(reserveButton).toBeVisible({ timeout: 10000 })

  const [reserveResponse] = await Promise.all([
    page.waitForResponse((response) =>
      response.url().includes('/reserve') && response.request().method() === 'PATCH'
    ),
    reserveButton.click(),
  ])
  if (!reserveResponse.ok()) {
    throw new Error(`Reserva fallida: ${reserveResponse.status()} ${await reserveResponse.text()}`)
  }
  await expect(page.getByText(/Reservat/i)).toBeVisible({ timeout: 10000 })
  await expect(reserveButton).toHaveAttribute('aria-label', /Desreservar/i)

  const [unreserveResponse] = await Promise.all([
    page.waitForResponse((response) =>
      response.url().includes('/reserve') && response.request().method() === 'PATCH'
    ),
    reserveButton.click(),
  ])
  if (!unreserveResponse.ok()) {
    throw new Error(`Desreservar fallit: ${unreserveResponse.status()} ${await unreserveResponse.text()}`)
  }
  await expect(reserveButton).toHaveAttribute('aria-label', /Reservar/i)

  const prestecButton = page.getByRole('button', { name: /pr[eèé]stec/i })
  await expect(prestecButton).toBeVisible({ timeout: 10000 })

  const [prestecResponse] = await Promise.all([
    page.waitForResponse((response) =>
      response.url().includes('/loan') && response.request().method() === 'PATCH'
    ),
    prestecButton.click(),
  ])
  if (!prestecResponse.ok()) {
    throw new Error(`Préstec fallit: ${prestecResponse.status()} ${await prestecResponse.text()}`)
  }
  await expect(prestecButton).toHaveClass(/bg-green-500/)

  const [unprestecResponse] = await Promise.all([
    page.waitForResponse((response) =>
      response.url().includes('/loan') && response.request().method() === 'PATCH'
    ),
    prestecButton.click(),
  ])
  if (!unprestecResponse.ok()) {
    throw new Error(`Desmarcar préstec fallit: ${unprestecResponse.status()} ${await unprestecResponse.text()}`)
  }
  await expect(prestecButton).not.toHaveClass(/bg-green-500/)
})
