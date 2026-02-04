/**
 * Sincronitza l'esquema de la BD de test abans dels tests E2E.
 * S'executa com a globalSetup de Playwright: ha d'exportar una funció,
 * sense cridar process.exit() per no tancar el runner.
 */
const fs = require('fs')
const path = require('path')
const { spawnSync } = require('child_process')

async function globalSetup() {
  const envPath = path.join(__dirname, '..', '.env.test')

  if (!fs.existsSync(envPath)) {
    console.warn('[test-db-setup] No s\'ha trobat .env.test; es fan servir les variables d\'entorn actuals.')
  } else {
    const content = fs.readFileSync(envPath, 'utf8')
    content.split('\n').forEach((line) => {
      const trimmed = line.trim()
      if (!trimmed || trimmed.startsWith('#')) return
      const [key, ...rest] = trimmed.split('=')
      if (!key) return
      const value = rest.join('=').trim().replace(/^"|"$/g, '')
      if (!process.env[key]) process.env[key] = value
    })
  }

  if (!process.env.DATABASE_URL && !process.env.TEST_DATABASE_URL) {
    throw new Error('[test-db-setup] DATABASE_URL o TEST_DATABASE_URL no definit.')
  }

  const prismaCommand = process.platform === 'win32'
    ? path.join(__dirname, '..', 'node_modules', '.bin', 'prisma.cmd')
    : path.join(__dirname, '..', 'node_modules', '.bin', 'prisma')

  console.log('[test-db-setup] Sincronitzant esquema amb la BD de test (force-reset)...')
  const result = spawnSync(
    prismaCommand,
    ['db', 'push', '--force-reset', '--accept-data-loss', '--skip-generate'],
    {
      stdio: 'inherit',
      env: { ...process.env, DATABASE_URL: process.env.TEST_DATABASE_URL || process.env.DATABASE_URL },
      shell: process.platform === 'win32',
    }
  )

  if (result.error) {
    throw new Error(`[test-db-setup] Error: ${result.error.message || result.error}`)
  }
  if (result.status !== 0) {
    throw new Error(`[test-db-setup] prisma db push ha sortit amb codi ${result.status}`)
  }
}

module.exports = globalSetup
