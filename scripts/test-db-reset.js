const fs = require('fs')
const path = require('path')
const { spawnSync } = require('child_process')

const envPath = path.join(__dirname, '..', '.env.test')

if (!fs.existsSync(envPath)) {
  console.error("No s'ha trobat el fitxer .env.test. Crea'l abans.")
  process.exit(1)
}

const content = fs.readFileSync(envPath, 'utf8')
content.split('\n').forEach((line) => {
  const trimmed = line.trim()
  if (!trimmed || trimmed.startsWith('#')) return
  const [key, ...rest] = trimmed.split('=')
  if (!key) return
  const value = rest.join('=').trim().replace(/^"|"$/g, '')
  if (!process.env[key]) {
    process.env[key] = value
  }
})

if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL no està definit a .env.test.')
  process.exit(1)
}

const result = spawnSync(
  'npx',
  ['prisma', 'db', 'push', '--force-reset', '--accept-data-loss'],
  {
    stdio: 'inherit',
    env: process.env,
  }
)

process.exit(result.status ?? 1)
