import packageJson from '../package.json'

export const APP_VERSION = (packageJson as { version?: string }).version ?? '0.1.0'
