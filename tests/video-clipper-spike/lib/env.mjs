// Load environment variables from project-root .env.local.
import { config } from 'dotenv'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const projectRoot = resolve(__dirname, '../../..')

config({ path: resolve(projectRoot, '.env.local') })

export const env = {
  REPLICATE_API_TOKEN: process.env.REPLICATE_API_TOKEN || '',
  OPENROUTER_API_KEY: process.env.OPENROUTER_API_KEY || '',
}

export function requireEnv(keys) {
  const missing = keys.filter((k) => !env[k])
  if (missing.length > 0) {
    console.error(`\n❌ Missing env vars: ${missing.join(', ')}`)
    console.error(`   Add them to .env.local in project root.\n`)
    process.exit(1)
  }
}

export const PROJECT_ROOT = projectRoot
