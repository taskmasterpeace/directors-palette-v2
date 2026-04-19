// Replicate wrapper using the official SDK (hoisted from project root node_modules).
import Replicate from 'replicate'
import { env, requireEnv } from './env.mjs'
import { log } from './log.mjs'

requireEnv(['REPLICATE_API_TOKEN'])

export const replicate = new Replicate({ auth: env.REPLICATE_API_TOKEN })

/**
 * Run a model and return the output. Polls until done.
 * @param {string} model - "owner/name" or "owner/name:version"
 * @param {object} input
 */
export async function runModel(model, input) {
  log.dim(`Replicate: ${model}`)
  const started = Date.now()
  const output = await replicate.run(model, { input })
  const elapsed = ((Date.now() - started) / 1000).toFixed(1)
  log.dim(`  completed in ${elapsed}s`)
  return output
}

/**
 * Upload a local file to Replicate file storage.
 * Returns a URL usable as model input.
 */
export async function uploadFile(filePath) {
  const { readFile } = await import('node:fs/promises')
  const { basename } = await import('node:path')
  const data = await readFile(filePath)
  const blob = new Blob([data])
  const file = await replicate.files.create(blob, {
    filename: basename(filePath),
  })
  return file.urls.get
}
