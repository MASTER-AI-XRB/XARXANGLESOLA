const fs = require('fs')
const path = require('path')

const nextDir = path.join(process.cwd(), '.next')

try {
  if (fs.existsSync(nextDir)) {
    fs.rmSync(nextDir, { recursive: true, force: true })
  }
} catch (error) {
  // No volem fallar els tests per una neteja fallida
  console.warn('No s\'ha pogut esborrar la cache de .next:', error?.message || error)
}
